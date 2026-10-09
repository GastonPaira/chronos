// Hook de racha diaria: sin cuenta se guarda en el dispositivo; con cuenta de Google, en Supabase.
// Al iniciar sesión, la racha del dispositivo se fusiona con la de la cuenta.

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toLocalDateKey, toPreviousLocalDateKey } from '@/lib/dates';
import { readLocal, writeLocal, removeLocal } from '@/lib/localStore';
import {
  applyPlay,
  getStatus,
  mergeStreaks,
  EMPTY_STREAK,
  type PlayResult,
  type StreakData,
  type StreakStatus,
} from '@/lib/streak';

export type { PlayResult, StreakStatus };

const LOCAL_KEY = 'chronos_streak';

type StreakRow = { last_played_date: string | null; current_streak: number; longest_streak: number };

const fromRow = (row: StreakRow): StreakData => ({
  lastPlayedDate: row.last_played_date,
  currentStreak: row.current_streak,
  longestStreak: row.longest_streak,
});

async function saveRemote(userId: string, data: StreakData): Promise<void> {
  await supabase.from('user_streak').upsert(
    {
      user_id: userId,
      last_played_date: data.lastPlayedDate,
      current_streak: data.currentStreak,
      longest_streak: data.longestStreak,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

/**
 * Loads the signed-in player's streak; if this device has an anonymous streak,
 * merges it into the account once and clears the local copy.
 */
async function loadForUser(userId: string): Promise<StreakData> {
  const { data: row } = await supabase
    .from('user_streak')
    .select('last_played_date, current_streak, longest_streak')
    .eq('user_id', userId)
    .maybeSingle();

  const account = row ? fromRow(row as StreakRow) : EMPTY_STREAK;
  const local = readLocal<StreakData>(LOCAL_KEY);
  if (!local?.lastPlayedDate) return account;

  const merged = mergeStreaks(account, local);
  await saveRemote(userId, merged);
  removeLocal(LOCAL_KEY);
  return merged;
}

/**
 * Manages the player's daily play streak.
 *
 * @returns
 * - `currentStreak`, `longestStreak`, `lastPlayedDate` – current values.
 * - `registerPlay()` – call once when a game ends; returns what changed.
 * - `getStreakStatus()` – status relative to today, for UI messages.
 */
export function useStreak() {
  const { user, loading } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>(EMPTY_STREAK);
  const dataRef = useRef<StreakData>(EMPTY_STREAK);

  const apply = useCallback((data: StreakData) => {
    dataRef.current = data;
    setStreakData(data);
  }, []);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    const load = async () => {
      const data = user ? await loadForUser(user.id) : readLocal<StreakData>(LOCAL_KEY) ?? EMPTY_STREAK;
      if (!cancelled) apply(data);
    };
    load();

    return () => { cancelled = true; };
  }, [user, loading, apply]);

  const registerPlay = useCallback((): PlayResult => {
    const { data, outcome } = applyPlay(dataRef.current, toLocalDateKey(), toPreviousLocalDateKey());
    if (data) {
      apply(data);
      if (user) saveRemote(user.id, data);
      else writeLocal(LOCAL_KEY, data);
    }
    return outcome;
  }, [user, apply]);

  const getStreakStatus = useCallback(
    (): StreakStatus => getStatus(dataRef.current, toLocalDateKey(), toPreviousLocalDateKey()),
    [],
  );

  return {
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    lastPlayedDate: streakData.lastPlayedDate,
    registerPlay,
    getStreakStatus,
  };
}
