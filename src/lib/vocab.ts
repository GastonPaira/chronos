// Lógica pura del vocabulario: marcar palabras del glosario en un texto y armar el repaso de fin de ronda.
// Sin React ni navegador, así que se testea directo (ver src/lib/__tests__/vocab.test.ts).

import type { Question, VocabEntry } from '@/types';
import { shuffle, type RandomFn } from '@/lib/questions';
import { LEARNED_STREAK, isDue, wordKey, type WordStore } from '@/lib/words';

/** A piece of text: either plain or a glossary word. */
export interface TextSegment {
  text: string;
  entry?: VocabEntry;
}

/** A glossary word with the sentence it appears in. */
export interface VocabWord extends VocabEntry {
  sentence: string;
}

export type ReviewKind = 'meaning' | 'cloze';

/** One card of the end-of-round review. */
export interface ReviewItem {
  kind: ReviewKind;
  term: string;
  es: string;
  /** Sentence where the word appears; for `cloze` the word is replaced by `BLANK`. */
  sentence: string;
  options: string[];
  correctIndex: number;
}

export const BLANK = '_____';
export const REVIEW_SIZE = 5;
const OPTION_COUNT = 3;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Case-insensitive, whole-word regex for the terms (longest first), or `null` if there are none.
 * Group 1 is the character before the word (no lookbehind: older iOS Safari can't parse it), group 2 the word.
 */
function termsRegex(terms: readonly string[], flags: string): RegExp | null {
  const sorted = terms.filter(Boolean).sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return null;
  return new RegExp(`(^|[^A-Za-z])(${sorted.map(escapeRegExp).join('|')})(?![A-Za-z])`, flags);
}

/** Splits `text` into plain and glossary segments, keeping the original text and casing. */
export function splitByVocab(text: string, vocab: readonly VocabEntry[] | undefined): TextSegment[] {
  const regex = vocab?.length ? termsRegex(vocab.map(v => v.term), 'gi') : null;
  if (!regex || !vocab) return [{ text }];

  const byTerm = new Map(vocab.map(v => [wordKey(v.term), v]));
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(regex)) {
    const start = (match.index ?? 0) + match[1].length;
    if (start > last) segments.push({ text: text.slice(last, start) });
    segments.push({ text: match[2], entry: byTerm.get(wordKey(match[2])) });
    last = start + match[2].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

/** True if `term` appears as a whole word or phrase in `text`. */
export function containsTerm(text: string, term: string): boolean {
  const regex = termsRegex([term], 'i');
  return regex ? regex.test(text) : false;
}

/** Texts of a question where a glossary term may appear, in order of preference for context sentences. */
export function questionTexts(question: Question): string[] {
  return [question.explanation.en, question.question.en, question.meanwhile.en, question.reflection.en];
}

function sentencesOf(text: string): string[] {
  return (text.match(/[^.!?]+(?:[.!?]+["')\]]?|$)/g) ?? []).map(s => s.trim()).filter(Boolean);
}

/** First sentence of the question's texts that contains `term`, or `null`. */
export function findSentence(question: Question, term: string): string | null {
  for (const text of questionTexts(question)) {
    const found = sentencesOf(text).find(sentence => containsTerm(sentence, term));
    if (found) return found;
  }
  return null;
}

/** Every distinct glossary word in the questions (first occurrence wins), with its context sentence. */
export function collectVocab(questions: readonly Question[]): VocabWord[] {
  const words = new Map<string, VocabWord>();
  for (const question of questions) {
    for (const entry of question.vocab ?? []) {
      const key = wordKey(entry.term);
      if (words.has(key)) continue;
      const sentence = findSentence(question, entry.term);
      if (sentence) words.set(key, { ...entry, sentence });
    }
  }
  return [...words.values()];
}

/** Replaces every occurrence of `term` in `sentence` with the blank. */
export function blankOut(sentence: string, term: string): string {
  const regex = termsRegex([term], 'gi');
  return regex ? sentence.replace(regex, (_match, before: string) => `${before}${BLANK}`) : sentence;
}

/** Higher = reviewed first: tapped this round > failed before > new in this round > already learned. */
function priority(word: VocabWord, touched: ReadonlySet<string>, inRound: ReadonlySet<string>, store: WordStore): number {
  const key = wordKey(word.term);
  const progress = store[key];
  if (touched.has(key)) return 3;
  if (progress && progress.seen > 0 && progress.streak === 0) return 2;
  if (inRound.has(key) && !(progress && progress.streak >= LEARNED_STREAK)) return 1;
  return 0;
}

export interface BuildReviewInput {
  /** Questions played in this round. */
  roundQuestions: readonly Question[];
  /** All questions in the app: source of distractors and of words missed in earlier rounds. */
  allQuestions: readonly Question[];
  /** Normalized terms (see `wordKey`) the player tapped during the round. */
  touched: ReadonlySet<string>;
  store: WordStore;
  size?: number;
  random?: RandomFn;
}

/**
 * Builds the end-of-round review: up to `size` cards alternating "what does it mean" and "fill the blank".
 * Distractors come from other glossary words. Returns `[]` when there are not enough words to build options.
 */
export function buildReview({
  roundQuestions,
  allQuestions,
  touched,
  store,
  size = REVIEW_SIZE,
  random = Math.random,
}: BuildReviewInput): ReviewItem[] {
  const pool = collectVocab(allQuestions);
  if (pool.length < OPTION_COUNT) return [];

  const inRound = new Set(collectVocab(roundQuestions).map(w => wordKey(w.term)));
  const candidates = shuffle(pool, random)
    .map(word => ({ word, score: priority(word, touched, inRound, store) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ word }) => word);
  const chosen = pickDistinctSentences(candidates, size);

  return makeReviewItems(chosen, pool, random);
}

/** Turns words into review cards in random order, alternating "meaning" and "fill the blank". */
export function makeReviewItems(
  words: readonly VocabWord[],
  pool: readonly VocabWord[],
  random: RandomFn = Math.random,
): ReviewItem[] {
  return shuffle(words, random).map((word, index) =>
    makeItem(word, pool, index % 2 === 0 ? 'meaning' : 'cloze', random),
  );
}

export interface DailyReviewInput {
  allQuestions: readonly Question[];
  store: WordStore;
  /** Local date `YYYY-MM-DD`. */
  today: string;
  size?: number;
  /** Max new words mixed in when there are words due. With nothing due, the whole review can be new words. */
  maxNew?: number;
  random?: RandomFn;
}

/**
 * Builds the daily review: words that are due first (weakest first), then new words from the glossary.
 * Works for a brand-new player too, who simply gets new words.
 */
export function buildDailyReview({
  allQuestions,
  store,
  today,
  size = 6,
  maxNew = 3,
  random = Math.random,
}: DailyReviewInput): ReviewItem[] {
  const pool = collectVocab(allQuestions);
  if (pool.length < OPTION_COUNT) return [];

  const byKey = new Map(pool.map(word => [wordKey(word.term), word]));
  const due = shuffle(Object.values(store).filter(progress => isDue(progress, today)), random)
    .sort((a, b) => a.streak - b.streak)
    .map(progress => byKey.get(wordKey(progress.term)))
    .filter((word): word is VocabWord => word !== undefined)
    .slice(0, size);

  const fresh = shuffle(pool.filter(word => !store[wordKey(word.term)]), random);
  const room = size - due.length;
  const newLimit = due.length === 0 ? room : Math.min(room, maxNew);
  return makeReviewItems([...due, ...fresh.slice(0, newLimit)], pool, random);
}

/**
 * Takes up to `size` words, preferring ones from different sentences: two cards that share a
 * sentence would give away each other's answer. Repeats are used only to fill the remaining slots.
 */
function pickDistinctSentences(words: readonly VocabWord[], size: number): VocabWord[] {
  const used = new Set<string>();
  const picked: VocabWord[] = [];
  for (const word of words) {
    if (picked.length < size && !used.has(word.sentence)) {
      used.add(word.sentence);
      picked.push(word);
    }
  }
  for (const word of words) {
    if (picked.length < size && !picked.includes(word)) picked.push(word);
  }
  return picked;
}

function makeItem(word: VocabWord, pool: readonly VocabWord[], kind: ReviewKind, random: RandomFn): ReviewItem {
  const key = wordKey(word.term);
  const others = shuffle(pool.filter(other => wordKey(other.term) !== key), random);

  if (kind === 'meaning') {
    const wrong = others.filter(o => wordKey(o.es) !== wordKey(word.es)).slice(0, OPTION_COUNT - 1);
    return withOptions(word, kind, word.sentence, word.es, wrong.map(o => o.es), random);
  }

  // A distractor that also appears in the sentence would make the blank ambiguous.
  const wrong = others.filter(o => !containsTerm(word.sentence, o.term)).slice(0, OPTION_COUNT - 1);
  return withOptions(word, kind, blankOut(word.sentence, word.term), word.term, wrong.map(o => o.term), random);
}

function withOptions(
  word: VocabWord,
  kind: ReviewKind,
  sentence: string,
  correct: string,
  wrong: string[],
  random: RandomFn,
): ReviewItem {
  const options = shuffle([correct, ...wrong], random);
  return { kind, term: word.term, es: word.es, sentence, options, correctIndex: options.indexOf(correct) };
}
