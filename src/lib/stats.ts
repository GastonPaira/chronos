// Lógica pura de estadísticas: sin React ni Supabase, para poder testearla.

import type { Difficulty } from '@/types';

/** Per-category performance counters. */
export interface CategoryStats {
  answered: number;
  correct: number;
  /** Local date (`YYYY-MM-DD`) of the last answer in this category. */
  lastPlayed: string;
}

/** Complete stats document (stored as JSON in `user_stats.data` or in localStorage). */
export interface Stats {
  global: {
    totalAnswered: number;
    totalCorrect: number;
    sessionsCompleted: number;
    perfectSessions: number;
    /** Highest single-session score ever achieved. */
    bestScore: number;
  };
  byCategory: Record<string, CategoryStats>;
  byDifficulty: Record<Difficulty, { answered: number; correct: number }>;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export function makeEmptyStats(): Stats {
  return {
    global: { totalAnswered: 0, totalCorrect: 0, sessionsCompleted: 0, perfectSessions: 0, bestScore: 0 },
    byCategory: {},
    byDifficulty: {
      easy: { answered: 0, correct: 0 },
      medium: { answered: 0, correct: 0 },
      hard: { answered: 0, correct: 0 },
    },
  };
}

export function hasProgress(stats: Stats | null | undefined): stats is Stats {
  return !!stats && (stats.global.totalAnswered > 0 || stats.global.sessionsCompleted > 0);
}

export function applyAnswer(
  current: Stats,
  answer: { categoryId: string; difficulty: Difficulty; isCorrect: boolean },
  today: string,
): Stats {
  const point = answer.isCorrect ? 1 : 0;
  const category = current.byCategory[answer.categoryId] ?? { answered: 0, correct: 0, lastPlayed: today };
  const difficulty = current.byDifficulty[answer.difficulty];

  return {
    ...current,
    global: {
      ...current.global,
      totalAnswered: current.global.totalAnswered + 1,
      totalCorrect: current.global.totalCorrect + point,
    },
    byCategory: {
      ...current.byCategory,
      [answer.categoryId]: {
        answered: category.answered + 1,
        correct: category.correct + point,
        lastPlayed: today,
      },
    },
    byDifficulty: {
      ...current.byDifficulty,
      [answer.difficulty]: {
        answered: difficulty.answered + 1,
        correct: difficulty.correct + point,
      },
    },
  };
}

export function applySessionEnd(current: Stats, session: { score: number; total: number }): Stats {
  return {
    ...current,
    global: {
      ...current.global,
      sessionsCompleted: current.global.sessionsCompleted + 1,
      perfectSessions: current.global.perfectSessions + (session.score === session.total ? 1 : 0),
      bestScore: Math.max(current.global.bestScore, session.score),
    },
  };
}

/** Adds a device's anonymous stats to an account's stats when the player signs in. */
export function mergeStats(account: Stats, local: Stats): Stats {
  const byCategory: Record<string, CategoryStats> = { ...account.byCategory };
  for (const [id, localCategory] of Object.entries(local.byCategory)) {
    const accountCategory = byCategory[id];
    byCategory[id] = accountCategory
      ? {
          answered: accountCategory.answered + localCategory.answered,
          correct: accountCategory.correct + localCategory.correct,
          lastPlayed: accountCategory.lastPlayed > localCategory.lastPlayed
            ? accountCategory.lastPlayed
            : localCategory.lastPlayed,
        }
      : localCategory;
  }

  const byDifficulty = { ...account.byDifficulty };
  for (const d of DIFFICULTIES) {
    byDifficulty[d] = {
      answered: account.byDifficulty[d].answered + local.byDifficulty[d].answered,
      correct: account.byDifficulty[d].correct + local.byDifficulty[d].correct,
    };
  }

  return {
    global: {
      totalAnswered: account.global.totalAnswered + local.global.totalAnswered,
      totalCorrect: account.global.totalCorrect + local.global.totalCorrect,
      sessionsCompleted: account.global.sessionsCompleted + local.global.sessionsCompleted,
      perfectSessions: account.global.perfectSessions + local.global.perfectSessions,
      bestScore: Math.max(account.global.bestScore, local.global.bestScore),
    },
    byCategory,
    byDifficulty,
  };
}
