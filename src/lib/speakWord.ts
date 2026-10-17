// Lee una palabra o una frase en voz alta: con el mp3 si existe, si no con la mejor voz del navegador.

import audioManifest from '@/data/audio-manifest.json';
import { pickEnglishVoice } from '@/lib/speech';

const AVAILABLE_MP3 = new Set<string>(audioManifest as string[]);

export function speakWord(text: string, lang: 'en-US' | 'es-ES' = 'en-US'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = lang === 'en-US' ? pickEnglishVoice(synth.getVoices()) : null;
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? lang;
  synth.speak(utterance);
}

/** True when the browser can speak (and so the listening exercise makes sense). */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Reads a whole sentence in English. Uses the mp3 `mp3Id` when it exists (natural voice);
 * otherwise, or if the mp3 fails to load, the best browser voice, a bit slower than normal.
 * Cuts whatever was being read. Returns a function that cancels this reading.
 */
export function speakSentence(text: string, onEnd?: () => void, mp3Id?: string): () => void {
  if (typeof window !== 'undefined' && mp3Id && AVAILABLE_MP3.has(mp3Id)) {
    return playMp3(`/audio/v2/${mp3Id}.mp3`, onEnd, () => speakWithVoice(text, onEnd));
  }
  return speakWithVoice(text, onEnd);
}

function playMp3(src: string, onEnd: (() => void) | undefined, fallback: () => () => void): () => void {
  window.speechSynthesis?.cancel();
  const audio = new Audio(src);
  let cancelled = false;
  let failed = false;
  let cancelFallback = () => {};
  const fail = () => {
    if (cancelled || failed) return;
    failed = true;
    cancelFallback = fallback();
  };
  audio.onended = () => { if (!cancelled) onEnd?.(); };
  audio.onerror = fail;
  audio.play().catch(fail);
  return () => {
    cancelled = true;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    cancelFallback();
  };
}

function speakWithVoice(text: string, onEnd?: () => void): () => void {
  if (!canSpeak()) return () => {};
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickEnglishVoice(synth.getVoices());
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'en-US';
  utterance.rate = 0.9;
  let cancelled = false;
  utterance.onend = () => { if (!cancelled) onEnd?.(); };
  synth.speak(utterance);
  return () => {
    cancelled = true;
    synth.cancel();
  };
}
