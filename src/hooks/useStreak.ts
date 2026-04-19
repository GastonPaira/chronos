import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, getDeviceId } from '@/lib/supabase';

interface StreakData {
  lastPlayedDate: string | null;
  currentStreak: number;
  longestStreak: number;
}

export type PlayResult = {
  result: 'already_today' | 'incremented' | 'reset' | 'first_time';
  isNewRecord: boolean;
};

export type StreakStatus = 'never_played' | 'active_today' | 'active_yesterday' | 'lost';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

const EMPTY: StreakData = { lastPlayedDate: null, currentStreak: 0, longestStreak: 0 };

export function useStreak() {
  const [streakData, setStreakData] = useState<StreakData>(EMPTY);
  const dataRef = useRef<StreakData>(EMPTY);

  useEffect(() => {
    const deviceId = getDeviceId();
    if (!deviceId) return;

    supabase
      .from('user_streak')
      .select('last_played_date, current_streak, longest_streak')
      .eq('device_id', deviceId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const loaded: StreakData = {
          lastPlayedDate: data.last_played_date,
          currentStreak: data.current_streak,
          longestStreak: data.longest_streak,
        };
        dataRef.current = loaded;
        setStreakData(loaded);
      });
  }, []);

  const persist = useCallback((updated: StreakData) => {
    dataRef.current = updated;
    setStreakData(updated);
    const deviceId = getDeviceId();
    if (!deviceId) return;
    supabase
      .from('user_streak')
      .upsert({
        device_id: deviceId,
        last_played_date: updated.lastPlayedDate,
        current_streak: updated.currentStreak,
        longest_streak: updated.longestStreak,
        updated_at: new Date().toISOString(),
      })
      .then();
  }, []);

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
