// Hook de racha diaria: carga, registra y persiste la racha de juego por usuario o dispositivo.

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, getDeviceId } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

/** Streak data stored in the `user_streak` Supabase table. */
interface StreakData {
  /** ISO date of the last day the user completed a game (`YYYY-MM-DD`), or `null` if never played. */
  lastPlayedDate: string | null;
  /** Number of consecutive days the user has played. */
  currentStreak: number;
  /** All-time highest consecutive-day streak. */
  longestStreak: number;
}

/**
 * Outcome of calling `registerPlay`.
 *
 * @property result
 *   - `'already_today'` – player already played today; streak unchanged.
 *   - `'incremented'` – player played yesterday; streak extended by 1.
 *   - `'reset'` – more than one day missed; streak restarted from 1.
 *   - `'first_time'` – very first game ever; streak starts at 1.
 * @property isNewRecord – `true` if the current streak just surpassed the previous longest streak.
 */
export type PlayResult = {
  result: 'already_today' | 'incremented' | 'reset' | 'first_time';
  isNewRecord: boolean;
};

/**
 * Describes the player's streak status relative to today.
 * - `'never_played'` – no recorded play history.
 * - `'active_today'` – already played today; streak is safe.
 * - `'active_yesterday'` – played yesterday; streak survives until midnight.
 * - `'lost'` – last play was more than a day ago; streak is broken.
 */
export type StreakStatus = 'never_played' | 'active_today' | 'active_yesterday' | 'lost';

/** @returns Today's date as an ISO `YYYY-MM-DD` string in local time. */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** @returns Yesterday's date as an ISO `YYYY-MM-DD` string in local time. */
function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

const EMPTY: StreakData = { lastPlayedDate: null, currentStreak: 0, longestStreak: 0 };

/**
 * Manages the player's daily play streak, persisted in Supabase.
 *
 * Data is keyed by authenticated user ID when signed in, or by a stable device
 * ID for anonymous players. State is loaded on mount and reloaded on auth changes.
 *
 * A `ref` mirrors the state so that `registerPlay` always reads the latest
 * values without needing to be re-created on each render.
 *
 * @returns
 * - `currentStreak` – number of consecutive days the player has played.
 * - `longestStreak` – all-time best consecutive-day streak.
 * - `lastPlayedDate` – ISO date of the most recent completed game, or `null`.
 * - `registerPlay()` – call once when a game session ends; returns a `PlayResult` describing what changed.
 * - `getStreakStatus()` – returns a `StreakStatus` value for display purposes without mutating state.
 */
export function useStreak() {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>(EMPTY);
  const dataRef = useRef<StreakData>(EMPTY);

  // Reload streak whenever the authenticated user changes (login/logout).
  useEffect(() => {
    async function load() {
      let query = supabase
        .from('user_streak')
        .select('last_played_date, current_streak, longest_streak');

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        const deviceId = getDeviceId();
        if (!deviceId) return;
        query = query.eq('device_id', deviceId);
      }

      const { data } = await query.maybeSingle();
      if (!data) return;

      const loaded: StreakData = {
        lastPlayedDate: data.last_played_date,
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
      };
      dataRef.current = loaded;
      setStreakData(loaded);
    }

    load();
  }, [user]);

  /**
   * Writes updated streak data to local state and upserts to Supabase.
   *
   * @param updated - The new `StreakData` to store.
   */
  const persist = useCallback((updated: StreakData) => {
    dataRef.current = updated;
    setStreakData(updated);

    const row = {
      last_played_date: updated.lastPlayedDate,
      current_streak: updated.currentStreak,
      longest_streak: updated.longestStreak,
      updated_at: new Date().toISOString(),
    };

    if (user) {
      supabase
        .from('user_streak')
        .upsert({ ...row, user_id: user.id }, { onConflict: 'user_id' })
        .then();
    } else {
      const deviceId = getDeviceId();
      if (!deviceId) return;
      supabase
        .from('user_streak')
        .upsert({ ...row, device_id: deviceId }, { onConflict: 'device_id' })
        .then();
    }
  }, [user]);

  /**
   * Registers a completed game session for streak purposes.
   * Must be called exactly once per game session (the `useGame` hook enforces this with a ref guard).
   *
   * Logic:
   * - Already played today → no change, returns `'already_today'`.
   * - First game ever → streak = 1, returns `'first_time'`.
   * - Last played yesterday → streak + 1, returns `'incremented'`.
   * - Last played before yesterday → streak reset to 1, returns `'reset'`.
   *
   * @returns A `PlayResult` describing the outcome and whether a new record was set.
   *
   * Side effects: calls `persist` to update Supabase when the streak changes.
   */
  const registerPlay = useCallback((): PlayResult => {
    const today = getTodayString();
    const yesterday = getYesterdayString();
    const current = dataRef.current;

    if (current.lastPlayedDate === today) {
      return { result: 'already_today', isNewRecord: false };
    }

    let newStreak: number;
    let result: 'incremented' | 'reset' | 'first_time';

    if (current.lastPlayedDate === null) {
      newStreak = 1;
      result = 'first_time';
    } else if (current.lastPlayedDate === yesterday) {
      newStreak = current.currentStreak + 1;
      result = 'incremented';
    } else {
      newStreak = 1;
      result = 'reset';
    }

    const isNewRecord = newStreak > 1 && newStreak > current.longestStreak;
    persist({
      lastPlayedDate: today,
      currentStreak: newStreak,
      longestStreak: Math.max(current.longestStreak, newStreak),
    });

    return { result, isNewRecord };
  }, [persist]);

  /**
   * Returns the player's current streak status without modifying any state.
   * Reads from the `ref` so the return value is always up-to-date.
   *
   * @returns A `StreakStatus` value suitable for driving UI messages.
   */
  const getStreakStatus = useCallback((): StreakStatus => {
    const data = dataRef.current;
    if (!data.lastPlayedDate) return 'never_played';
    const today = getTodayString();
    const yesterday = getYesterdayString();
    if (data.lastPlayedDate === today) return 'active_today';
    if (data.lastPlayedDate === yesterday) return 'active_yesterday';
    return 'lost';
  }, []);

  return {
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    lastPlayedDate: streakData.lastPlayedDate,
    registerPlay,
    getStreakStatus,
  };
}
