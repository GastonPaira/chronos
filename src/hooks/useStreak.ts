import { useState, useCallback } from 'react';

const STORAGE_KEY = 'chronos_streak';

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

function readStorage(): StreakData {
  if (typeof window === 'undefined') {
    return { lastPlayedDate: null, currentStreak: 0, longestStreak: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastPlayedDate: null, currentStreak: 0, longestStreak: 0 };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { lastPlayedDate: null, currentStreak: 0, longestStreak: 0 };
  }
}

function writeStorage(data: StreakData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore write errors (e.g. private browsing quota)
  }
}

export function useStreak() {
  const [streakData, setStreakData] = useState<StreakData>(() => readStorage());

  const registerPlay = useCallback((): PlayResult => {
    const today = getTodayString();
    const yesterday = getYesterdayString();
    const current = readStorage();

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
    const updated: StreakData = {
      lastPlayedDate: today,
      currentStreak: newStreak,
      longestStreak: Math.max(current.longestStreak, newStreak),
    };

    writeStorage(updated);
    setStreakData(updated);

    return { result, isNewRecord };
  }, []);

  const getStreakStatus = useCallback((): StreakStatus => {
    const data = readStorage();
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
