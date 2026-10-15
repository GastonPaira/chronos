// Lee una palabra o una frase en voz alta con la voz del navegador (si el dispositivo tiene).

import { pickEnglishVoice } from '@/lib/speech';

export function speakWord(text: string, lang: 'en-US' | 'es-ES' = 'en-US'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}

/** True when the browser can speak (and so the listening exercise makes sense). */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Reads a whole sentence in English with the best voice available, a bit slower than normal.
 * Cuts whatever was being read. Returns a function that cancels this reading.
 */
export function speakSentence(text: string, onEnd?: () => void): () => void {
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
