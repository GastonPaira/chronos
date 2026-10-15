// Hook de narración: reproduce el mp3 si existe; si no, lee el texto con la voz del navegador, frase por frase.
// Suena un solo texto a la vez: al empezar uno se corta el anterior. Informa qué frase suena (para resaltarla).

import { useCallback, useEffect, useRef, useState } from 'react';
import audioManifest from '@/data/audio-manifest.json';
import { pickEnglishVoice, spanAtFraction, splitSpans, type TextSpan } from '@/lib/speech';

const AVAILABLE_MP3 = new Set<string>(audioManifest as string[]);
const VOICE_RATE = 0.9;
const VOICE_LOAD_TIMEOUT_MS = 1500;

export type NarrationMode = 'mp3' | 'voice';
export type NarrationStatus = 'idle' | 'playing' | 'paused';

interface Active {
  key: string;
  mode: NarrationMode;
  status: NarrationStatus;
  /** Sentence positions inside the narrated text. */
  spans: TextSpan[];
  /** Index in `spans` of the sentence being read. */
  sentence: number;
}

/** Options for `start`. */
export interface StartOptions {
  /** Called when the text has been read to the end (not when it is stopped or fails). */
  onEnd?: () => void;
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
 * - `spokenSpanOf(key)` – position of the sentence being read inside that text, or `null`.
 * - `start(key, { mp3Id, text }, { onEnd })`, `pause(key)`, `resume(key)`, `restart(key)`, `stop()`.
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
      audioRef.current.ontimeupdate = null;
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

  const playVoice = useCallback((key: string, text: string, run: number, onEnd?: () => void) => {
    if (!voice) return;
    const spans = splitSpans(text);
    const speakChunk = (index: number) => {
      if (runRef.current !== run) return;
      if (index >= spans.length) {
        setActive(null);
        onEnd?.();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text.slice(spans[index].start, spans[index].end));
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = VOICE_RATE;
      utterance.onstart = () => {
        if (runRef.current === run) setActive(prev => (prev ? { ...prev, sentence: index } : prev));
      };
      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = () => { if (runRef.current === run) setActive(null); };
      window.speechSynthesis.speak(utterance);
    };
    setActive({ key, mode: 'voice', status: 'playing', spans, sentence: 0 });
    speakChunk(0);
  }, [voice]);

  const start = useCallback((key: string, source: { mp3Id: string; text: string }, options: StartOptions = {}) => {
    stop();
    const run = runRef.current;
    const mode = modeFor(source.mp3Id);
    if (mode === 'voice') {
      playVoice(key, source.text, run, options.onEnd);
      return;
    }
    if (mode !== 'mp3') return;

    const spans = splitSpans(source.text);
    const audio = new Audio(`/audio/v2/${source.mp3Id}.mp3`);
    audio.onended = () => {
      if (runRef.current !== run) return;
      setActive(null);
      options.onEnd?.();
    };
    // The mp3 has no timestamps: estimate the sentence from how much of it has played.
    audio.ontimeupdate = () => {
      if (runRef.current !== run || !audio.duration) return;
      const sentence = spanAtFraction(spans, audio.currentTime / audio.duration);
      setActive(prev => (prev && prev.sentence !== sentence ? { ...prev, sentence } : prev));
    };
    // If the mp3 fails to load (e.g. offline), fall back to the browser voice.
    audio.onerror = () => { if (runRef.current === run) playVoice(key, source.text, run, options.onEnd); };
    audioRef.current = audio;
    setActive({ key, mode: 'mp3', status: 'playing', spans, sentence: 0 });
    audio.play().catch(() => { if (runRef.current === run) playVoice(key, source.text, run, options.onEnd); });
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
    setActive({ ...active, status: 'playing', sentence: 0 });
  }, [active]);

  const statusOf = useCallback(
    (key: string): NarrationStatus => (active?.key === key ? active.status : 'idle'),
    [active],
  );

  const spokenSpanOf = useCallback(
    (key: string): TextSpan | null => (active?.key === key ? active.spans[active.sentence] ?? null : null),
    [active],
  );

  const activeMode = active?.mode ?? null;

  return { modeFor, statusOf, spokenSpanOf, activeMode, start, pause, resume, restart, stop };
}
