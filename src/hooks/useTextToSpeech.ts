// Hook de síntesis de voz: intenta reproducir MP3 pre-generados y usa Web Speech API como fallback.

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Locale } from '@/types';

/** Preferred BCP-47 language codes ordered by priority for each locale. */
const LANG_PREFS: Record<Locale, string[]> = {
  en: ['en-US', 'en-GB', 'en-AU'],
  es: ['es-ES', 'es-MX', 'es-AR'],
};

/** Voice name substrings that indicate a higher-quality (neural/premium) voice. */
const QUALITY_KEYWORDS = ['neural', 'natural', 'premium', 'enhanced'];

/**
 * Assigns a quality score to a voice based on its name.
 * Neural/premium voices score 1; standard voices score 0.
 */
function scoreVoice(voice: SpeechSynthesisVoice): number {
  return QUALITY_KEYWORDS.some(k => voice.name.toLowerCase().includes(k)) ? 1 : 0;
}

/**
 * Picks the best available voice for the given locale.
 * Iterates through preferred language codes in priority order, then falls back
 * to any voice whose language starts with the locale prefix.
 */
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

/**
 * Waits for the browser's voice list to be populated.
 * On some browsers (Chrome) voices load asynchronously after the first call.
 */
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

/**
 * @returns `true` when the user agent indicates an Android device.
 *   Safe to call during SSR (returns `false` when `navigator` is unavailable).
 */
function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Provides text-to-speech playback using pre-generated MP3 files with
 * automatic fallback to the Web Speech API when an MP3 is unavailable.
 *
 * Disabled on Android because the platform's TTS implementation has
 * reliability issues. `isSupported` is exposed so callers can hide audio
 * controls on Android.
 *
 * @param locale - The active app locale (kept for API compatibility).
 *
 * @returns
 * - `speak(text, lang, id)` – plays `/audio/${id}.mp3` if it exists, otherwise
 *   falls back to Web Speech API using `lang` for voice selection. Calling
 *   `speak` with the same `id` that is currently playing acts as a toggle (stops).
 * - `stop()` – stops any current audio (MP3 or utterance) and clears `speakingId`.
 * - `speakingId` – the `id` of the currently active `speak` call, or `null`.
 * - `isSupported` – `false` on Android where TTS is unreliable.
 */
export function useTextToSpeech(locale: Locale) {
  void locale; // kept for call-site compatibility; lang is now passed per-call
  const [isSupported, setIsSupported] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Evaluate after mount to avoid SSR/hydration mismatch.
  // True on any browser that supports the Audio API — Android included.
  useEffect(() => {
    setIsSupported(typeof Audio !== 'undefined');
  }, []);

  /** Stops both the MP3 player and any active Web Speech utterance. */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setSpeakingId(null);
  }, []);

  /**
   * Speaks the given text using the best available voice for `lang`.
   * Tries `/audio/${id}.mp3` first; falls back to Web Speech API on error.
   * Calling with the same `id` that is currently playing stops playback (toggle).
   */
  const speak = useCallback(
    (text: string, lang: string, id: string) => {
      if (typeof window === 'undefined') return;

      if (speakingId === id) {
        stop();
        return;
      }

      stop();

      const mp3Path = `/audio/${id}.mp3`;
      const audio = new Audio(mp3Path);

      audio.oncanplaythrough = () => {
        audioRef.current = audio;
        setSpeakingId(id);
        audio.play();
        audio.onended = () => setSpeakingId(null);
      };

      audio.onerror = async () => {
        // MP3 not found — fall back to Web Speech API (skip on Android, MP3 should always exist)
        if (isAndroid()) return;
        if (!('speechSynthesis' in window)) return;
        const voices = await loadVoices();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.88;
        utterance.pitch = 1.05;

        const bestVoice = pickBestVoice(voices, lang as Locale);
        if (bestVoice) {
          utterance.voice = bestVoice;
          utterance.lang = bestVoice.lang;
        } else {
          utterance.lang = lang === 'en' ? 'en-US' : 'es-ES';
        }

        utterance.onend = () => setSpeakingId(null);
        utterance.onerror = () => setSpeakingId(null);
        utteranceRef.current = utterance;
        setSpeakingId(id);
        window.speechSynthesis.speak(utterance);
      };

      audio.load();
    },
    [speakingId, stop]
  );

  // Stop any audio when the component using this hook unmounts.
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, speakingId, isSupported };
}
