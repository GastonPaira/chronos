// Lógica pura de la racha diaria: sin React ni Supabase, para poder testearla.

/** Streak data persisted per player. */
export interface StreakData {
  /** Local date (`YYYY-MM-DD`) of the last completed game, or `null` if never played. */
  lastPlayedDate: string | null;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Outcome of registering a play.
 * - `'already_today'` – already played today; streak unchanged.
 * - `'incremented'` – played yesterday; streak extended by 1.
 * - `'reset'` – one or more days missed; streak restarted at 1.
 * - `'first_time'` – first game ever; streak starts at 1.
 */
export type PlayResult = {
  result: 'already_today' | 'incremented' | 'reset' | 'first_time';
  isNewRecord: boolean;
};

export type StreakStatus = 'never_played' | 'active_today' | 'active_yesterday' | 'lost';

export const EMPTY_STREAK: StreakData = { lastPlayedDate: null, currentStreak: 0, longestStreak: 0 };

/**
 * Computes the streak after a game finishes.
 * Returns `data: null` when nothing changed (already played today).
 */
export function applyPlay(
  current: StreakData,
  today: string,
  yesterday: string,
): { data: StreakData | null; outcome: PlayResult } {
  if (current.lastPlayedDate === today) {
    return { data: null, outcome: { result: 'already_today', isNewRecord: false } };
  }

  let currentStreak: number;
  let result: 'incremented' | 'reset' | 'first_time';

  if (current.lastPlayedDate === null) {
    currentStreak = 1;
    result = 'first_time';
  } else if (current.lastPlayedDate === yesterday) {
    currentStreak = current.currentStreak + 1;
    result = 'incremented';
  } else {
    currentStreak = 1;
    result = 'reset';
  }

  const isNewRecord = currentStreak > 1 && currentStreak > current.longestStreak;
  return {
    data: {
      lastPlayedDate: today,
      currentStreak,
      longestStreak: Math.max(current.longestStreak, currentStreak),
    },
    outcome: { result, isNewRecord },
  };
}

/** Streak status relative to today, for UI messages. */
export function getStatus(data: StreakData, today: string, yesterday: string): StreakStatus {
  if (!data.lastPlayedDate) return 'never_played';
  if (data.lastPlayedDate === today) return 'active_today';
  if (data.lastPlayedDate === yesterday) return 'active_yesterday';
  return 'lost';
}

/** Merges a device's local streak into an account's streak when the player signs in. */
export function mergeStreaks(account: StreakData, local: StreakData): StreakData {
  const accountDate = account.lastPlayedDate ?? '';
  const localDate = local.lastPlayedDate ?? '';
  const newest = localDate > accountDate ? local : account;
  return {
    lastPlayedDate: newest.lastPlayedDate,
    currentStreak: newest.currentStreak,
    longestStreak: Math.max(account.longestStreak, local.longestStreak),
  };
}
