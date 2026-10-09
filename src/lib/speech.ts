// Utilidades puras para la voz del navegador (Web Speech API).

/**
 * Splits text into sentences so the browser voice reads it in short pieces.
 * Long single utterances are often cut off midway on Android and in Chrome.
 * Very long sentences are further split at commas/semicolons near `maxLength`.
 */
export function splitSentences(text: string, maxLength = 220): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .match(/[^.!?]+(?:[.!?]+["')\]]?|$)/g) ?? [];

  return sentences
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(sentence => splitLong(sentence, maxLength));
}

function splitLong(sentence: string, maxLength: number): string[] {
  if (sentence.length <= maxLength) return [sentence];
  const parts: string[] = [];
  let current = '';
  // Split after , ; : — keeping the punctuation (no regex lookbehind: older iOS Safari can't parse it).
  const pieces = sentence.replace(/([,;:—])\s+/g, '$1\u0000').split('\u0000');
  for (const piece of pieces) {
    if (current && (current + ' ' + piece).length > maxLength) {
      parts.push(current);
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) parts.push(current);
  return parts;
}

const QUALITY_HINTS = ['neural', 'natural', 'premium', 'enhanced', 'google'];
const PREFERRED_LANGS = ['en-US', 'en-GB', 'en-AU'];

/** Picks the best English voice available, or `null` if the device has none. */
export function pickEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('en'));
  if (english.length === 0) return null;

  const score = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.replace('_', '-');
    const langRank = PREFERRED_LANGS.indexOf(lang);
    const quality = QUALITY_HINTS.some(h => voice.name.toLowerCase().includes(h)) ? 10 : 0;
    return quality + (langRank === -1 ? 0 : PREFERRED_LANGS.length - langRank);
  };

  return [...english].sort((a, b) => score(b) - score(a))[0];
}
