import { useState, useEffect, useCallback, useRef } from 'react';
import type { Locale } from '@/types';

const LANG_PREFS: Record<Locale, string[]> = {
  en: ['en-US', 'en-GB', 'en-AU'],
  es: ['es-ES', 'es-MX', 'es-AR'],
};

const QUALITY_KEYWORDS = ['neural', 'natural', 'premium', 'enhanced'];

function scoreVoice(voice: SpeechSynthesisVoice): number {
  return QUALITY_KEYWORDS.some(k => voice.name.toLowerCase().includes(k)) ? 1 : 0;
}

function pickBestVoice(voices: SpeechSynthesisVoice[], locale: Locale): SpeechSynthesisVoice | null {
  for (const langCode of LANG_PREFS[locale]) {
    const matches = voices
      .filter(v => v.lang === langCode || v.lang.startsWith(langCode + '-'))
      .sort((a, b) => scoreVoice(b) - scoreVoice(a));
    if (matches.length > 0) return matches[0];
  }
  const prefix = locale === 'en' ? 'en' : 'es';
  const fallbacks = voices
    .filter(v => v.lang.startsWith(prefix))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return fallbacks[0] ?? null;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) return resolve(voices);
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => resolve(window.speechSynthesis.getVoices()),
      { once: true }
    );
  });
}

export function useTextToSpeech(locale: Locale) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    async (text: string, id: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      if (speakingId === id) {
        stop();
        return;
      }

      stop();

      const voices = await loadVoices();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.pitch = 1.05;

      const bestVoice = pickBestVoice(voices, locale);
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      } else {
        utterance.lang = locale === 'en' ? 'en-US' : 'es-ES';
      }

      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);

      utteranceRef.current = utterance;
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    },
    [locale, speakingId, stop]
  );

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, speakingId };
}
