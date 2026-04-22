// Hook de síntesis de voz: selecciona la mejor voz disponible según el idioma activo.

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
 *
 * @param voice - A `SpeechSynthesisVoice` to evaluate.
 * @returns `1` for high-quality voices, `0` for standard voices.
 */
function scoreVoice(voice: SpeechSynthesisVoice): number {
  return QUALITY_KEYWORDS.some(k => voice.name.toLowerCase().includes(k)) ? 1 : 0;
}

/**
 * Picks the best available voice for the given locale.
 * Iterates through preferred language codes in priority order, then falls back
 * to any voice whose language starts with the locale prefix.
 * Within each tier, higher-quality voices are preferred.
 *
 * @param voices - The full list of voices from `speechSynthesis.getVoices()`.
 * @param locale - The active app locale (`'en'` or `'es'`).
 * @returns The best matching `SpeechSynthesisVoice`, or `null` if none found.
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
 *
 * @returns A promise that resolves with the available `SpeechSynthesisVoice[]`.
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
 * Provides text-to-speech playback using the Web Speech API.
 *
 * Disabled on Android because the platform's TTS implementation has
 * reliability issues (voices cut off, events don't fire consistently).
 * `isSupported` is exposed so callers can hide audio controls on Android.
 *
 * @param locale - The active app locale used to select an appropriate voice.
 *
 * @returns
 * - `speak(text, id)` – speaks the given text; if `id` matches `speakingId`, stops instead (toggle behaviour). Cancels any current utterance before starting a new one.
 * - `stop()` – cancels the current utterance and clears `speakingId`.
 * - `speakingId` – the `id` passed to the currently active `speak` call, or `null` when idle.
 * - `isSupported` – `false` on Android where TTS is unreliable.
 *
 * Side effects: cancels speech synthesis when the component using this hook unmounts.
 */
export function useTextToSpeech(locale: Locale) {
  const android = isAndroid();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /**
   * Cancels the current utterance and resets playback state.
   * Safe to call even when nothing is playing.
   */
  const stop = useCallback(() => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  /**
   * Speaks the given text using the best available voice for the current locale.
   * If the same `id` is already speaking, calling `speak` again acts as a toggle (stops playback).
   *
   * @param text - The plain-text string to read aloud.
   * @param id - A unique identifier for this utterance, used to track which section is playing.
   *
   * Side effects: calls `window.speechSynthesis.speak()` which plays audio through the device speaker.
   */
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

  // Stop speech synthesis when the component unmounts to avoid orphaned audio.
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, speakingId, isSupported: !android };
}
