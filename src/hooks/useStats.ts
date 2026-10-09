// Hook de estadísticas: sin cuenta se guardan en el dispositivo; con cuenta de Google, en Supabase.
// Al iniciar sesión, las estadísticas del dispositivo se suman a las de la cuenta.

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toLocalDateKey } from '@/lib/dates';
import { readLocal, writeLocal, removeLocal } from '@/lib/localStore';
import {
  applyAnswer,
  applySessionEnd,
  hasProgress,
  makeEmptyStats,
  mergeStats,
  type Stats,
} from '@/lib/stats';
import type { Difficulty } from '@/types';

export type { Stats };

const LOCAL_KEY = 'chronos_stats';

async function saveRemote(userId: string, data: Stats): Promise<void> {
  await supabase
    .from('user_stats')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

/**
 * Loads the signed-in player's stats; if this device has anonymous stats,
 * adds them to the account once and clears the local copy.
 */
async function loadForUser(userId: string): Promise<Stats> {
  const { data: row } = await supabase.from('user_stats').select('data').eq('user_id', userId).maybeSingle();
  const account = (row?.data as Stats | undefined) ?? makeEmptyStats();
  const local = readLocal<Stats>(LOCAL_KEY);
  if (!hasProgress(local)) return account;

  const merged = mergeStats(account, local);
  await saveRemote(userId, merged);
  removeLocal(LOCAL_KEY);
  return merged;
}

const percent = (correct: number, answered: number) =>
  answered ? Math.round((correct / answered) * 100) : 0;

/**
 * Manages persistent player statistics.
 *
 * @returns
 * - `stats` – current stats, or `null` until loaded.
 * - `recordAnswer`, `recordSessionEnd`, `resetStats` – mutations (persisted immediately).
 * - `getAccuracy`, `getCategoryAccuracy`, `getDifficultyAccuracy` – percentages 0–100.
 * - `getStrongestCategory`, `getWeakestCategory` – category slug (min. 5 answers) or `null`.
 */
export function useStats() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const statsRef = useRef<Stats>(makeEmptyStats());

  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    const load = async () => {
      const data = user ? await loadForUser(user.id) : readLocal<Stats>(LOCAL_KEY) ?? makeEmptyStats();
      if (cancelled) return;
      statsRef.current = data;
      setStats(data);
    };
    load();

    return () => { cancelled = true; };
  }, [user, loading]);

  const persist = useCallback((updated: Stats) => {
    statsRef.current = updated;
    setStats(updated);
    if (user) saveRemote(user.id, updated);
    else writeLocal(LOCAL_KEY, updated);
  }, [user]);

  const recordAnswer = useCallback(
    (answer: { categoryId: string; difficulty: Difficulty; isCorrect: boolean }) =>
      persist(applyAnswer(statsRef.current, answer, toLocalDateKey())),
    [persist],
  );

  const recordSessionEnd = useCallback(
    (session: { score: number; total: number }) => persist(applySessionEnd(statsRef.current, session)),
    [persist],
  );

  const resetStats = useCallback(() => persist(makeEmptyStats()), [persist]);

  const getAccuracy = useCallback((): number => {
    const { totalCorrect, totalAnswered } = statsRef.current.global;
    return percent(totalCorrect, totalAnswered);
  }, []);

  const getCategoryAccuracy = useCallback((id: string): number => {
    const category = statsRef.current.byCategory[id];
    return category ? percent(category.correct, category.answered) : 0;
  }, []);

  const getDifficultyAccuracy = useCallback((d: string): number => {
    const difficulty = statsRef.current.byDifficulty[d as Difficulty];
    return difficulty ? percent(difficulty.correct, difficulty.answered) : 0;
  }, []);

  const rankCategories = useCallback((direction: 1 | -1): string | null => {
    const ranked = Object.entries(statsRef.current.byCategory)
      .filter(([, c]) => c.answered >= 5)
      .sort((a, b) => direction * (b[1].correct / b[1].answered - a[1].correct / a[1].answered));
    return ranked[0]?.[0] ?? null;
  }, []);

  const getStrongestCategory = useCallback(() => rankCategories(1), [rankCategories]);
  const getWeakestCategory = useCallback(() => rankCategories(-1), [rankCategories]);

  return {
    stats,
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
