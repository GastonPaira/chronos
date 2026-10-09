import { describe, expect, it } from 'vitest';
import { applyAnswer, applySessionEnd, hasProgress, makeEmptyStats, mergeStats } from '@/lib/stats';

const TODAY = '2026-10-09';

describe('stats', () => {
  it('counts answers by category and difficulty', () => {
    let stats = applyAnswer(makeEmptyStats(), { categoryId: 'vikings', difficulty: 'easy', isCorrect: true }, TODAY);
    stats = applyAnswer(stats, { categoryId: 'vikings', difficulty: 'hard', isCorrect: false }, TODAY);
    expect(stats.global).toMatchObject({ totalAnswered: 2, totalCorrect: 1 });
    expect(stats.byCategory.vikings).toEqual({ answered: 2, correct: 1, lastPlayed: TODAY });
    expect(stats.byDifficulty.hard).toEqual({ answered: 1, correct: 0 });
  });

  it('records sessions, perfect sessions and best score', () => {
    let stats = applySessionEnd(makeEmptyStats(), { score: 10, total: 10 });
    stats = applySessionEnd(stats, { score: 4, total: 10 });
    expect(stats.global).toMatchObject({ sessionsCompleted: 2, perfectSessions: 1, bestScore: 10 });
  });

  it('adds anonymous device stats to the account on sign-in', () => {
    const account = applyAnswer(makeEmptyStats(), { categoryId: 'vikings', difficulty: 'easy', isCorrect: true }, '2026-10-01');
    const local = applySessionEnd(
      applyAnswer(makeEmptyStats(), { categoryId: 'vikings', difficulty: 'easy', isCorrect: false }, TODAY),
      { score: 7, total: 10 },
    );
    const merged = mergeStats(account, local);
    expect(merged.global).toMatchObject({ totalAnswered: 2, totalCorrect: 1, sessionsCompleted: 1, bestScore: 7 });
    expect(merged.byCategory.vikings).toEqual({ answered: 2, correct: 1, lastPlayed: TODAY });
    expect(merged.byDifficulty.easy).toEqual({ answered: 2, correct: 1 });
  });

  it('knows when there is progress worth migrating', () => {
    expect(hasProgress(null)).toBe(false);
    expect(hasProgress(makeEmptyStats())).toBe(false);
    expect(hasProgress(applySessionEnd(makeEmptyStats(), { score: 0, total: 10 }))).toBe(true);
  });
});
