import { describe, expect, it } from 'vitest';
import { applyPlay, getStatus, mergeStreaks, EMPTY_STREAK, type StreakData } from '@/lib/streak';

const TODAY = '2026-10-09';
const YESTERDAY = '2026-10-08';

const streak = (lastPlayedDate: string | null, currentStreak: number, longestStreak: number): StreakData =>
  ({ lastPlayedDate, currentStreak, longestStreak });

describe('applyPlay', () => {
  it('starts at 1 on the first game ever', () => {
    const { data, outcome } = applyPlay(EMPTY_STREAK, TODAY, YESTERDAY);
    expect(outcome).toEqual({ result: 'first_time', isNewRecord: false });
    expect(data).toEqual(streak(TODAY, 1, 1));
  });

  it('does nothing when already played today', () => {
    const { data, outcome } = applyPlay(streak(TODAY, 3, 5), TODAY, YESTERDAY);
    expect(outcome.result).toBe('already_today');
    expect(data).toBeNull();
  });

  it('adds one day when the last game was yesterday', () => {
    const { data, outcome } = applyPlay(streak(YESTERDAY, 3, 5), TODAY, YESTERDAY);
    expect(outcome).toEqual({ result: 'incremented', isNewRecord: false });
    expect(data).toEqual(streak(TODAY, 4, 5));
  });

  it('flags a new record when the streak passes the longest one', () => {
    const { data, outcome } = applyPlay(streak(YESTERDAY, 5, 5), TODAY, YESTERDAY);
    expect(outcome.isNewRecord).toBe(true);
    expect(data).toEqual(streak(TODAY, 6, 6));
  });

  it('resets to 1 after missing a day, keeping the record', () => {
    const { data, outcome } = applyPlay(streak('2026-10-01', 7, 9), TODAY, YESTERDAY);
    expect(outcome.result).toBe('reset');
    expect(data).toEqual(streak(TODAY, 1, 9));
  });
});

describe('getStatus', () => {
  it.each([
    [EMPTY_STREAK, 'never_played'],
    [streak(TODAY, 2, 2), 'active_today'],
    [streak(YESTERDAY, 2, 2), 'active_yesterday'],
    [streak('2026-10-01', 2, 2), 'lost'],
  ] as const)('%o → %s', (data, expected) => {
    expect(getStatus(data, TODAY, YESTERDAY)).toBe(expected);
  });
});

describe('mergeStreaks', () => {
  it('keeps the most recent streak and the best record', () => {
    expect(mergeStreaks(streak('2026-10-01', 2, 10), streak(TODAY, 3, 3))).toEqual(streak(TODAY, 3, 10));
    expect(mergeStreaks(streak(TODAY, 4, 4), streak('2026-10-01', 1, 6))).toEqual(streak(TODAY, 4, 6));
  });
});
