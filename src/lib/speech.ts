// Utilidades puras para la voz del navegador (Web Speech API).

/** A piece of a text: `text.slice(start, end)`. */
export interface TextSpan {
  start: number;
  end: number;
}

/**
 * Splits text into sentence spans (positions inside the original text), so the browser voice
 * reads it in short pieces and the screen can highlight the one being read.
 * Long single utterances are often cut off midway on Android and in Chrome.
 * Very long sentences are further split at commas/semicolons near `maxLength`.
 */
export function splitSpans(text: string, maxLength = 220): TextSpan[] {
  const spans: TextSpan[] = [];
  for (const match of text.matchAll(/[^.!?]+(?:[.!?]+["')\]]?|$)/g)) {
    const raw = match[0];
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const start = (match.index ?? 0) + lead;
    spans.push(...splitLong(text, { start, end: start + trimmed.length }, maxLength));
  }
  return spans;
}

/** Splits text into sentences so the browser voice reads it in short pieces. */
export function splitSentences(text: string, maxLength = 220): string[] {
  return splitSpans(text, maxLength).map(span => text.slice(span.start, span.end).replace(/\s+/g, ' '));
}

function splitLong(text: string, span: TextSpan, maxLength: number): TextSpan[] {
  if (span.end - span.start <= maxLength) return [span];
  const parts: TextSpan[] = [];
  let currentStart = span.start;
  let currentEnd = span.start;
  // Break after , ; : — keeping the punctuation (no regex lookbehind: older iOS Safari can't parse it).
  const sentence = text.slice(span.start, span.end);
  let pieceStart = 0;
  const pieces: TextSpan[] = [];
  for (const match of sentence.matchAll(/[,;:—]\s+/g)) {
    const end = (match.index ?? 0) + 1;
    pieces.push({ start: span.start + pieceStart, end: span.start + end });
    pieceStart = (match.index ?? 0) + match[0].length;
  }
  pieces.push({ start: span.start + pieceStart, end: span.end });

  for (const piece of pieces) {
    if (currentEnd > currentStart && piece.end - currentStart > maxLength) {
      parts.push({ start: currentStart, end: currentEnd });
      currentStart = piece.start;
    }
    currentEnd = piece.end;
  }
  if (currentEnd > currentStart) parts.push({ start: currentStart, end: currentEnd });
  return parts;
}

/**
 * Index of the sentence being spoken when `fraction` (0 to 1) of an audio of the text has played,
 * assuming speech speed is roughly proportional to the number of characters.
 */
export function spanAtFraction(spans: readonly TextSpan[], fraction: number): number {
  if (spans.length === 0) return -1;
  const total = spans.reduce((sum, span) => sum + (span.end - span.start), 0);
  const target = Math.min(Math.max(fraction, 0), 0.9999) * total;
  let acc = 0;
  for (let i = 0; i < spans.length; i++) {
    acc += spans[i].end - spans[i].start;
    if (target < acc) return i;
  }
  return spans.length - 1;
}

/** A part of a text segment, and whether it falls inside the highlighted range. */
export interface RangePart {
  text: string;
  inside: boolean;
}

/**
 * Cuts `text` (which starts at position `offset` of the full text) at the edges of `range`.
 * Returns one part when the range does not touch it, up to three when it does.
 */
export function splitByRange(text: string, offset: number, range: TextSpan | null | undefined): RangePart[] {
  if (!range) return [{ text, inside: false }];
  const from = Math.max(range.start - offset, 0);
  const to = Math.min(range.end - offset, text.length);
  if (from >= to) return [{ text, inside: false }];
  const parts: RangePart[] = [];
  if (from > 0) parts.push({ text: text.slice(0, from), inside: false });
  parts.push({ text: text.slice(from, to), inside: true });
  if (to < text.length) parts.push({ text: text.slice(to), inside: false });
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
