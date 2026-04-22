// Hook de estadísticas: registra respuestas y sesiones, persiste en Supabase por usuario o dispositivo.

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, getDeviceId } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

/** Per-category performance counters. */
interface CategoryStats {
  answered: number;
  correct: number;
  /** ISO date string (`YYYY-MM-DD`) of the last session in this category. */
  lastPlayed: string;
}

/**
 * Complete stats document stored in Supabase's `user_stats` table.
 *
 * @property global - Lifetime aggregate counters across all categories and difficulties.
 * @property byCategory - Per-category answer and correct-answer counts, keyed by category slug.
 * @property byDifficulty - Same breakdown split by difficulty tier.
 */
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
  byDifficulty: {
    easy: { answered: number; correct: number };
    medium: { answered: number; correct: number };
    hard: { answered: number; correct: number };
  };
}

/** Returns a zeroed-out `Stats` object used as the initial and reset value. */
function makeEmptyStats(): Stats {
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

/**
 * Manages persistent player statistics, backed by Supabase.
 *
 * Stats are stored per authenticated user (keyed by `user_id`) or per device
 * (keyed by `device_id`) for anonymous players. Data is loaded when the hook
 * mounts and re-loaded whenever the auth state changes (login/logout).
 *
 * A `ref` is used alongside state to ensure `recordAnswer` and `recordSessionEnd`
 * always read the most current values without needing to be re-created on every render.
 *
 * @returns
 * - `stats` – the current `Stats` object, or `null` during SSR or before the first load.
 * - `recordAnswer({ categoryId, difficulty, isCorrect })` – records a single question answer; persists immediately.
 * - `recordSessionEnd({ score, total })` – records the end of a game session; updates best score and perfect count.
 * - `resetStats()` – overwrites stored stats with empty counters.
 * - `getAccuracy()` – returns overall correct percentage (0–100), or 0 if no answers recorded.
 * - `getCategoryAccuracy(id)` – per-category correct percentage, or 0 if fewer than 1 answer.
 * - `getDifficultyAccuracy(d)` – per-difficulty correct percentage.
 * - `getStrongestCategory()` – slug of the category with the highest accuracy (minimum 5 answers), or `null`.
 * - `getWeakestCategory()` – slug of the category with the lowest accuracy (minimum 5 answers), or `null`.
 */
export function useStats() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const statsRef = useRef<Stats>(makeEmptyStats());

  // Reload stats whenever the authenticated user changes (login/logout).
  useEffect(() => {
    setMounted(true);

    async function load() {
      let query = supabase.from('user_stats').select('data');

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        const deviceId = getDeviceId();
        if (!deviceId) { setStats(makeEmptyStats()); return; }
        query = query.eq('device_id', deviceId);
      }

      const { data } = await query.maybeSingle();
      const loaded = (data?.data as Stats | undefined) ?? makeEmptyStats();
      statsRef.current = loaded;
      setStats(loaded);
    }

    load();
  }, [user]);

  /**
   * Writes updated stats to local state and upserts to Supabase.
   * Uses the authenticated user ID when available, otherwise falls back to device ID.
   *
   * @param updated - The new complete `Stats` object to persist.
   */
  const persist = useCallback((updated: Stats) => {
    statsRef.current = updated;
    setStats(updated);

    if (user) {
      supabase
        .from('user_stats')
        .upsert({ user_id: user.id, data: updated, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .then();
    } else {
      const deviceId = getDeviceId();
      if (!deviceId) return;
      supabase
        .from('user_stats')
        .upsert({ device_id: deviceId, data: updated, updated_at: new Date().toISOString() }, { onConflict: 'device_id' })
        .then();
    }
  }, [user]);

  /**
   * Records a single answered question and persists the updated stats.
   *
   * @param params.categoryId - Slug of the category the question belongs to.
   * @param params.difficulty - Difficulty tier of the question.
   * @param params.isCorrect - Whether the player's selected answer was correct.
   */
  const recordAnswer = useCallback((params: {
    categoryId: string;
    difficulty: 'easy' | 'medium' | 'hard';
    isCorrect: boolean;
  }) => {
    const current = statsRef.current;
    const today = new Date().toISOString().split('T')[0];
    const prev = current.byCategory[params.categoryId] ?? { answered: 0, correct: 0, lastPlayed: today };

    persist({
      ...current,
      global: {
        ...current.global,
        totalAnswered: current.global.totalAnswered + 1,
        totalCorrect: current.global.totalCorrect + (params.isCorrect ? 1 : 0),
      },
      byCategory: {
        ...current.byCategory,
        [params.categoryId]: {
          answered: prev.answered + 1,
          correct: prev.correct + (params.isCorrect ? 1 : 0),
          lastPlayed: today,
        },
      },
      byDifficulty: {
        ...current.byDifficulty,
        [params.difficulty]: {
          answered: current.byDifficulty[params.difficulty].answered + 1,
          correct: current.byDifficulty[params.difficulty].correct + (params.isCorrect ? 1 : 0),
        },
      },
    });
  }, [persist]);

  /**
   * Records the completion of a full game session.
   * Updates `sessionsCompleted`, `perfectSessions` (when `score === total`), and `bestScore`.
   *
   * @param params.score - Number of correct answers in the session.
   * @param params.total - Total number of questions in the session.
   */
  const recordSessionEnd = useCallback((params: { score: number; total: number }) => {
    const current = statsRef.current;
    persist({
      ...current,
      global: {
        ...current.global,
        sessionsCompleted: current.global.sessionsCompleted + 1,
        perfectSessions: current.global.perfectSessions + (params.score === params.total ? 1 : 0),
        bestScore: Math.max(current.global.bestScore, params.score),
      },
    });
  }, [persist]);

  /** Resets all stats to zero and persists the empty document. */
  const resetStats = useCallback(() => persist(makeEmptyStats()), [persist]);

  /**
   * @returns Overall correct-answer percentage (0–100), rounded to the nearest integer.
   *   Returns 0 if no questions have been answered yet.
   */
  const getAccuracy = useCallback((): number => {
    const s = statsRef.current;
    if (!s.global.totalAnswered) return 0;
    return Math.round((s.global.totalCorrect / s.global.totalAnswered) * 100);
  }, []);

  /**
   * @param id - Category slug.
   * @returns Correct-answer percentage for the given category, or 0 if never answered.
   */
  const getCategoryAccuracy = useCallback((id: string): number => {
    const cat = statsRef.current.byCategory[id];
    if (!cat?.answered) return 0;
    return Math.round((cat.correct / cat.answered) * 100);
  }, []);

  /**
   * @param d - Difficulty tier (`'easy'`, `'medium'`, or `'hard'`).
   * @returns Correct-answer percentage for that difficulty, or 0 if never answered.
   */
  const getDifficultyAccuracy = useCallback((d: string): number => {
    const diff = statsRef.current.byDifficulty[d as 'easy' | 'medium' | 'hard'];
    if (!diff?.answered) return 0;
    return Math.round((diff.correct / diff.answered) * 100);
  }, []);

  /**
   * Finds the category with the highest accuracy among those with at least 5 answers.
   *
   * @returns The category slug, or `null` if no category has 5 or more answers.
   */
  const getStrongestCategory = useCallback((): string | null => {
    const sorted = Object.entries(statsRef.current.byCategory)
      .filter(([, v]) => v.answered >= 5)
      .sort((a, b) => (b[1].correct / b[1].answered) - (a[1].correct / a[1].answered));
    return sorted[0]?.[0] ?? null;
  }, []);

  /**
   * Finds the category with the lowest accuracy among those with at least 5 answers.
   *
   * @returns The category slug, or `null` if no category has 5 or more answers.
   */
  const getWeakestCategory = useCallback((): string | null => {
    const sorted = Object.entries(statsRef.current.byCategory)
      .filter(([, v]) => v.answered >= 5)
      .sort((a, b) => (a[1].correct / a[1].answered) - (b[1].correct / b[1].answered));
    return sorted[0]?.[0] ?? null;
  }, []);

  return {
    stats: mounted ? stats : null,
    recordAnswer,
    recordSessionEnd,
    resetStats,
    getAccuracy,
    getCategoryAccuracy,
    getDifficultyAccuracy,
    getStrongestCategory,
    getWeakestCategory,
  };
}
