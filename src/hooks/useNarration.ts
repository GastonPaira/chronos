// Hook de narración: reproduce el mp3 si existe; si no, lee el texto con la voz del navegador, frase por frase.
// Suena un solo texto a la vez: al empezar uno se corta el anterior.

import { useCallback, useEffect, useRef, useState } from 'react';
import audioManifest from '@/data/audio-manifest.json';
import { pickEnglishVoice, splitSentences } from '@/lib/speech';

const AVAILABLE_MP3 = new Set<string>(audioManifest as string[]);
const VOICE_RATE = 0.9;
const VOICE_LOAD_TIMEOUT_MS = 1500;

export type NarrationMode = 'mp3' | 'voice';
export type NarrationStatus = 'idle' | 'playing' | 'paused';

interface Active {
  key: string;
  mode: NarrationMode;
  status: NarrationStatus;
}

/** Waits for the browser's voice list (Chrome loads it asynchronously). */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    if (voices.length > 0) return resolve(voices);
    const done = () => resolve(synth.getVoices());
    synth.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, VOICE_LOAD_TIMEOUT_MS);
  });
}

/**
 * @returns
 * - `modeFor(mp3Id)` – `'mp3'`, `'voice'` or `null` (no audio possible: hide the button).
 * - `statusOf(key)` – playback status of the text identified by `key`.
 * - `start(key, { mp3Id, text })`, `pause(key)`, `resume(key)`, `restart(key)`, `stop()`.
 *   Pause/resume only apply to mp3: the browser voice pauses badly on Android.
 */
export function useNarration() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Incremented on every stop so callbacks from an old utterance are ignored.
  const runRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    let cancelled = false;
    loadVoices().then(voices => { if (!cancelled) setVoice(pickEnglishVoice(voices)); });
    return () => { cancelled = true; };
  }, []);

  const stop = useCallback(() => {
    runRef.current++;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setActive(null);
  }, []);

  useEffect(() => stop, [stop]);

  const modeFor = useCallback(
    (mp3Id: string): NarrationMode | null => {
      if (AVAILABLE_MP3.has(mp3Id)) return 'mp3';
      return voice ? 'voice' : null;
    },
    [voice],
  );

  const playVoice = useCallback((key: string, text: string, run: number) => {
    if (!voice) return;
    const chunks = splitSentences(text);
    const speakChunk = (index: number) => {
      if (runRef.current !== run) return;
      if (index >= chunks.length) {
        setActive(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = VOICE_RATE;
      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = () => { if (runRef.current === run) setActive(null); };
      window.speechSynthesis.speak(utterance);
    };
    setActive({ key, mode: 'voice', status: 'playing' });
    speakChunk(0);
  }, [voice]);

  const start = useCallback((key: string, source: { mp3Id: string; text: string }) => {
    stop();
    const run = runRef.current;
    const mode = modeFor(source.mp3Id);
    if (mode === 'voice') {
      playVoice(key, source.text, run);
      return;
    }
    if (mode !== 'mp3') return;

    const audio = new Audio(`/audio/${source.mp3Id}.mp3`);
    audio.onended = () => { if (runRef.current === run) setActive(null); };
    // If the mp3 fails to load (e.g. offline), fall back to the browser voice.
    audio.onerror = () => { if (runRef.current === run) playVoice(key, source.text, run); };
    audioRef.current = audio;
    setActive({ key, mode: 'mp3', status: 'playing' });
    audio.play().catch(() => { if (runRef.current === run) playVoice(key, source.text, run); });
  }, [stop, modeFor, playVoice]);

  const pause = useCallback((key: string) => {
    if (active?.key !== key || active.mode !== 'mp3') return;
    audioRef.current?.pause();
    setActive({ ...active, status: 'paused' });
  }, [active]);

  const resume = useCallback((key: string) => {
    if (active?.key !== key || active.mode !== 'mp3') return;
    audioRef.current?.play().catch(() => {});
    setActive({ ...active, status: 'playing' });
  }, [active]);

  const restart = useCallback((key: string) => {
    if (active?.key !== key || active.mode !== 'mp3' || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
    setActive({ ...active, status: 'playing' });
  }, [active]);

  const statusOf = useCallback(
    (key: string): NarrationStatus => (active?.key === key ? active.status : 'idle'),
    [active],
  );

  const activeMode = active?.mode ?? null;

  return { modeFor, statusOf, activeMode, start, pause, resume, restart, stop };
}
