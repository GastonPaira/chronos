// Progreso de vocabulario del jugador: qué palabras vio, cuáles acertó y cuáles ya aprendió.
// Lógica pura: se guarda en el dispositivo (ver useWords).

import { daysBetween } from '@/lib/dates';

/** Consecutive correct answers needed to count a word as learned. */
export const LEARNED_STREAK = 2;

export interface WordProgress {
  term: string;
  es: string;
  /** Times the word appeared in a review. */
  seen: number;
  correct: number;
  /** Consecutive correct answers; resets to 0 on a miss. */
  streak: number;
  /** Local date (`YYYY-MM-DD`) of the last review. */
  lastReviewed: string;
}

/** Words keyed by lowercase term. */
export type WordStore = Record<string, WordProgress>;

export interface ReviewResult {
  term: string;
  es: string;
  correct: boolean;
}

export const wordKey = (term: string) => term.trim().toLowerCase();

export const isLearned = (progress: WordProgress | undefined): boolean =>
  !!progress && progress.streak >= LEARNED_STREAK;

export function learnedCount(store: WordStore): number {
  return Object.values(store).filter(isLearned).length;
}

/** Applies a review's results. `newlyLearned` counts words that reached the learned streak just now. */
export function applyReview(
  store: WordStore,
  results: readonly ReviewResult[],
  today: string,
): { store: WordStore; newlyLearned: number } {
  const next: WordStore = { ...store };
  let newlyLearned = 0;

  for (const result of results) {
    const key = wordKey(result.term);
    const before = next[key];
    const streak = result.correct ? (before?.streak ?? 0) + 1 : 0;
    if (!isLearned(before) && streak >= LEARNED_STREAK) newlyLearned++;
    next[key] = {
      term: result.term,
      es: result.es,
      seen: (before?.seen ?? 0) + 1,
      correct: (before?.correct ?? 0) + (result.correct ? 1 : 0),
      streak,
      lastReviewed: today,
    };
  }
  return { store: next, newlyLearned };
}

/** Days to wait before a word is reviewed again, by consecutive correct answers (0, 1, 2, 3, 4 or more). */
const REVIEW_INTERVALS_DAYS = [1, 1, 3, 7, 14];

/** True if the word should come back in today's review: not reviewed yet today and its waiting time is over. */
export function isDue(progress: WordProgress, today: string): boolean {
  if (progress.lastReviewed === today) return false;
  const interval = REVIEW_INTERVALS_DAYS[Math.min(progress.streak, REVIEW_INTERVALS_DAYS.length - 1)];
  return daysBetween(progress.lastReviewed, today) >= interval;
}

export function dueCount(store: WordStore, today: string): number {
  return Object.values(store).filter(progress => isDue(progress, today)).length;
}
