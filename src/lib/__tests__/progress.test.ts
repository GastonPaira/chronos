import { describe, expect, it } from 'vitest';
import type { Question } from '@/types';
import questionsData from '@/data/questions';
import { daysBetween } from '@/lib/dates';
import { earnedAchievements, newAchievements } from '@/lib/achievements';
import {
  GOAL_WORDS,
  XP_CORRECT,
  XP_GOAL,
  XP_LESSON,
  XP_PERFECT,
  XP_WORD,
  XP_WRONG,
  applyAnswer,
  applyLesson,
  applyWordsReviewed,
  categoryProgress,
  levelFor,
  makeEmptyProgress,
  rollDaily,
  seenSet,
} from '@/lib/progress';
import { buildRound } from '@/lib/questions';
import { buildDailyReview, containsTerm } from '@/lib/vocab';
import { applyReview, dueCount, isDue, wordKey, type WordStore } from '@/lib/words';

const TODAY = '2026-10-13';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const answer = (id: string, correct: boolean, category = 'vikings') => ({ questionId: id, categoryId: category, correct });

describe('daysBetween', () => {
  it('counts calendar days, also across months and years', () => {
    expect(daysBetween('2026-10-13', '2026-10-13')).toBe(0);
    expect(daysBetween('2026-10-13', '2026-10-14')).toBe(1);
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-10-14', '2026-10-13')).toBe(-1);
  });
});

describe('levels', () => {
  it('starts at level 1 and moves up at the XP thresholds', () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(700).level).toBe(5);
    expect(levelFor(3200).level).toBe(10);
  });

  it('keeps leveling after the table ends', () => {
    expect(levelFor(3200 + 800).level).toBe(11);
    expect(levelFor(3200 + 1600).level).toBe(12);
  });

  it('reports progress inside the level', () => {
    const info = levelFor(175);
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(75);
    expect(info.xpForLevel).toBe(150);
    expect(info.fraction).toBeCloseTo(0.5);
  });
});

describe('answers and lessons', () => {
  it('pays XP per answer and remembers seen and missed questions', () => {
    let p = makeEmptyProgress(TODAY);
    p = applyAnswer(p, answer('vk-001', true));
    p = applyAnswer(p, answer('vk-002', false));
    expect(p.xp).toBe(XP_CORRECT + XP_WRONG);
    expect(p.seen.vikings).toEqual(['vk-001', 'vk-002']);
    expect(p.missed).toEqual(['vk-002']);
    // Answering the missed one correctly later clears it, without duplicating the seen entry.
    p = applyAnswer(p, answer('vk-002', true));
    expect(p.missed).toEqual([]);
    expect(p.seen.vikings).toEqual(['vk-001', 'vk-002']);
  });

  it('gives a completion bonus, and a bigger one for a perfect lesson', () => {
    const normal = applyLesson(makeEmptyProgress(TODAY), { score: 3, total: 5 });
    expect(normal.bonusXp).toBe(XP_LESSON);
    expect(normal.progress.perfectLessons).toBe(0);

    const perfect = applyLesson(makeEmptyProgress(TODAY), { score: 5, total: 5 });
    expect(perfect.bonusXp).toBe(XP_LESSON + XP_PERFECT);
    expect(perfect.progress.perfectLessons).toBe(1);
    expect(perfect.progress.lessonsCompleted).toBe(1);
  });

  it('counts a category as complete only after every question was answered', () => {
    let p = makeEmptyProgress(TODAY);
    p = applyAnswer(p, answer('a', true, 'cat'));
    p = applyAnswer(p, answer('b', true, 'cat'));
    expect(categoryProgress(p, 'cat', 3)).toMatchObject({ seen: 2, total: 3, complete: false });
    p = applyAnswer(p, answer('c', false, 'cat'));
    expect(categoryProgress(p, 'cat', 3)).toMatchObject({ seen: 3, complete: true, fraction: 1 });
    expect(seenSet(p).size).toBe(3);
  });
});

describe('daily goal', () => {
  it('needs a lesson and the words, in any order, and pays the bonus once', () => {
    let p = makeEmptyProgress(TODAY);
    const lesson = applyLesson(p, { score: 4, total: 5 });
    expect(lesson.goalCompleted).toBe(false);
    p = lesson.progress;

    const words = applyWordsReviewed(p, { correct: 4, total: GOAL_WORDS });
    expect(words.goalCompleted).toBe(true);
    expect(words.xp).toBe(4 * XP_WORD + XP_GOAL);
    expect(words.progress.goalDays).toBe(1);
    expect(words.progress.daily.goalDone).toBe(true);

    // More work the same day does not pay the bonus again.
    const more = applyWordsReviewed(words.progress, { correct: 5, total: 5 });
    expect(more.goalCompleted).toBe(false);
    expect(more.xp).toBe(5 * XP_WORD);
    expect(more.progress.goalDays).toBe(1);
  });

  it('works when the words come first', () => {
    let p = applyWordsReviewed(makeEmptyProgress(TODAY), { correct: 5, total: 5 }).progress;
    const lesson = applyLesson(p, { score: 2, total: 5 });
    expect(lesson.goalCompleted).toBe(true);
    expect(lesson.bonusXp).toBe(XP_LESSON + XP_GOAL);
  });

  it('starts fresh counters on a new day but keeps the totals', () => {
    let p = applyLesson(makeEmptyProgress(TODAY), { score: 5, total: 5 }).progress;
    const tomorrow = rollDaily(p, '2026-10-14');
    expect(tomorrow.daily).toEqual({ date: '2026-10-14', lessons: 0, words: 0, xp: 0, goalDone: false });
    expect(tomorrow.lessonsCompleted).toBe(1);
    expect(rollDaily(p, TODAY)).toBe(p);
  });
});

describe('achievements', () => {
  const totals = { cat: 2 };
  const ctx = (progress = makeEmptyProgress(TODAY), extra = {}) => ({ progress, streak: 0, learnedWords: 0, categoryTotals: totals, ...extra });

  it('earns nothing at the start', () => {
    expect(earnedAchievements(ctx())).toEqual([]);
  });

  it('unlocks by lessons, streak, words and level', () => {
    const p = applyLesson(makeEmptyProgress(TODAY), { score: 5, total: 5 }).progress;
    const ids = earnedAchievements(ctx(p, { streak: 7, learnedWords: 12 }));
    expect(ids).toEqual(expect.arrayContaining(['first_lesson', 'perfect_lesson', 'streak_3', 'streak_7', 'words_10']));
    expect(ids).not.toContain('streak_30');
    expect(ids).not.toContain('words_50');
  });

  it('unlocks a category achievement when every question was answered', () => {
    let p = applyAnswer(makeEmptyProgress(TODAY), answer('a', true, 'cat'));
    expect(earnedAchievements(ctx(p))).not.toContain('category:cat');
    p = applyAnswer(p, answer('b', false, 'cat'));
    expect(earnedAchievements(ctx(p))).toContain('category:cat');
  });

  it('reports only achievements that were not saved yet', () => {
    const p = applyLesson(makeEmptyProgress(TODAY), { score: 5, total: 5 }).progress;
    const saved = { ...p, achievements: { first_lesson: TODAY } };
    const fresh = newAchievements(ctx(saved));
    expect(fresh).toContain('perfect_lesson');
    expect(fresh).not.toContain('first_lesson');
  });
});

describe('lessons prefer questions the player has not seen', () => {
  const questions = (questionsData as Question[]).filter(q => q.category === 'vikings');

  it('serves unseen questions before seen ones', () => {
    const seen = new Set(questions.slice(0, 25).map(q => q.id));
    for (let seed = 1; seed <= 10; seed++) {
      const round = buildRound(questions, 5, undefined, seeded(seed), { seen, missed: new Set() });
      expect(round.every(q => !seen.has(q.id)), `seed ${seed}`).toBe(true);
    }
  });

  it('brings back missed questions before ones answered correctly', () => {
    const seen = new Set(questions.map(q => q.id));
    const missed = new Set(questions.slice(0, 3).map(q => q.id));
    const round = buildRound(questions, 5, undefined, seeded(4), { seen, missed });
    const ids = round.map(q => q.id);
    for (const id of missed) expect(ids).toContain(id);
  });

  it('still puts the story questions first', () => {
    const greece = (questionsData as Question[]).filter(q => q.category === 'ancient-greece');
    const round = buildRound(greece, 5, 'antikythera', seeded(2), { seen: new Set(), missed: new Set() });
    expect(round.every(q => q.story === 'antikythera')).toBe(true);
  });
});

describe('spaced review of words', () => {
  const store = (streak: number, lastReviewed: string): WordStore => ({
    gears: { term: 'gears', es: 'engranajes', seen: 3, correct: 2, streak, lastReviewed },
  });

  it('is never due on the day it was reviewed', () => {
    expect(isDue(store(0, TODAY).gears, TODAY)).toBe(false);
  });

  it('waits longer the better the player knows the word', () => {
    expect(isDue(store(0, '2026-10-12').gears, TODAY)).toBe(true);
    expect(isDue(store(2, '2026-10-12').gears, TODAY)).toBe(false);
    expect(isDue(store(2, '2026-10-10').gears, TODAY)).toBe(true);
    expect(isDue(store(5, '2026-10-06').gears, TODAY)).toBe(false);
    expect(isDue(store(5, '2026-09-29').gears, TODAY)).toBe(true);
    expect(dueCount(store(0, '2026-10-12'), TODAY)).toBe(1);
  });
});

describe('daily review', () => {
  const all = questionsData as Question[];

  it('gives a new player a full review of new words', () => {
    const items = buildDailyReview({ allQuestions: all, store: {}, today: TODAY, random: seeded(3) });
    expect(items.length).toBe(6);
    for (const item of items) {
      expect(item.options.length).toBe(3);
      expect(item.options[item.correctIndex]).toBeTruthy();
    }
  });

  it('puts due words first and mixes in only a few new ones', () => {
    // Every glossary word seen yesterday and missed: all of them are due.
    const words = new Set<string>();
    for (const q of all) for (const v of q.vocab ?? []) words.add(v.term);
    let store: WordStore = {};
    for (const term of [...words].slice(0, 10)) {
      store = applyReview(store, [{ term, es: 'x', correct: false }], '2026-10-12').store;
    }
    const items = buildDailyReview({ allQuestions: all, store, today: TODAY, random: seeded(5) });
    expect(items.length).toBe(6);
    const known = new Set(Object.keys(store));
    expect(items.every(item => known.has(wordKey(item.term)))).toBe(true);
  });

  it('does not repeat words already reviewed today', () => {
    let store: WordStore = {};
    const first = buildDailyReview({ allQuestions: all, store, today: TODAY, random: seeded(1) });
    store = applyReview(store, first.map(item => ({ term: item.term, es: item.es, correct: false })), TODAY).store;
    const second = buildDailyReview({ allQuestions: all, store, today: TODAY, random: seeded(2) });
    const firstTerms = new Set(first.map(item => wordKey(item.term)));
    expect(second.every(item => !firstTerms.has(wordKey(item.term)))).toBe(true);
    // The blanked sentence never shows its own answer.
    for (const item of second.filter(i => i.kind === 'cloze')) expect(containsTerm(item.sentence, item.term)).toBe(false);
  });
});
