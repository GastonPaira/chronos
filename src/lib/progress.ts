// Progreso del jugador: puntos (XP), nivel, meta diaria y qué preguntas ya vio de cada categoría.
// Lógica pura, sin React ni navegador, para poder testearla (ver src/lib/__tests__/progress.test.ts).

export const XP_CORRECT = 10;
export const XP_WRONG = 2;
export const XP_LESSON = 20;
export const XP_PERFECT = 10;
export const XP_WORD = 5;
export const XP_GOAL = 30;

/** Daily goal: finish this many lessons and review this many words. */
export const GOAL_LESSONS = 1;
export const GOAL_WORDS = 5;

export interface DailyProgress {
  /** Local date `YYYY-MM-DD` these counters belong to. */
  date: string;
  lessons: number;
  words: number;
  xp: number;
  goalDone: boolean;
}

export interface Progress {
  xp: number;
  lessonsCompleted: number;
  perfectLessons: number;
  /** Question ids the player has answered, by category. */
  seen: Record<string, string[]>;
  /** Question ids answered wrong the last time they appeared. */
  missed: string[];
  daily: DailyProgress;
  /** Days on which the daily goal was completed. */
  goalDays: number;
  /** Achievement id → local date it was unlocked. */
  achievements: Record<string, string>;
  onboarded: boolean;
}

export function makeEmptyProgress(today: string): Progress {
  return {
    xp: 0,
    lessonsCompleted: 0,
    perfectLessons: 0,
    seen: {},
    missed: [],
    daily: { date: today, lessons: 0, words: 0, xp: 0, goalDone: false },
    goalDays: 0,
    achievements: {},
    onboarded: false,
  };
}

/** Starts a fresh daily counter when the date has changed. */
export function rollDaily(progress: Progress, today: string): Progress {
  if (progress.daily.date === today) return progress;
  return { ...progress, daily: { date: today, lessons: 0, words: 0, xp: 0, goalDone: false } };
}

/** XP needed to reach each level (index 0 = level 1). After the last one, every level costs `XP_PER_EXTRA_LEVEL`. */
export const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
const XP_PER_EXTRA_LEVEL = 800;

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  /** XP the current level needs to be completed. */
  xpForLevel: number;
  /** 0 to 1. */
  fraction: number;
}

/** Levels with their own title in the language files; higher levels reuse the last one. */
export const MAX_TITLED_LEVEL = 10;

export function levelFor(xp: number): LevelInfo {
  const last = LEVEL_XP.length - 1;
  let level: number;
  let start: number;
  let size: number;
  if (xp >= LEVEL_XP[last]) {
    const extra = Math.floor((xp - LEVEL_XP[last]) / XP_PER_EXTRA_LEVEL);
    level = last + 1 + extra;
    start = LEVEL_XP[last] + extra * XP_PER_EXTRA_LEVEL;
    size = XP_PER_EXTRA_LEVEL;
  } else {
    let index = 0;
    while (index < last && xp >= LEVEL_XP[index + 1]) index++;
    level = index + 1;
    start = LEVEL_XP[index];
    size = LEVEL_XP[index + 1] - LEVEL_XP[index];
  }
  const xpIntoLevel = xp - start;
  return { level, xpIntoLevel, xpForLevel: size, fraction: xpIntoLevel / size };
}

export function isDailyGoalMet(daily: DailyProgress): boolean {
  return daily.lessons >= GOAL_LESSONS && daily.words >= GOAL_WORDS;
}

/** Marks the daily goal as done (once per day) and pays the bonus. */
function settleGoal(progress: Progress): { progress: Progress; goalCompleted: boolean } {
  if (progress.daily.goalDone || !isDailyGoalMet(progress.daily)) return { progress, goalCompleted: false };
  return {
    goalCompleted: true,
    progress: {
      ...progress,
      xp: progress.xp + XP_GOAL,
      goalDays: progress.goalDays + 1,
      daily: { ...progress.daily, goalDone: true, xp: progress.daily.xp + XP_GOAL },
    },
  };
}

export interface AnsweredQuestion {
  questionId: string;
  categoryId: string;
  correct: boolean;
}

/** Records one answer: marks the question as seen, remembers misses, and pays XP. */
export function applyAnswer(progress: Progress, answer: AnsweredQuestion): Progress {
  const seenInCategory = progress.seen[answer.categoryId] ?? [];
  const seen = seenInCategory.includes(answer.questionId)
    ? progress.seen
    : { ...progress.seen, [answer.categoryId]: [...seenInCategory, answer.questionId] };
  const missed = answer.correct
    ? progress.missed.filter(id => id !== answer.questionId)
    : progress.missed.includes(answer.questionId)
      ? progress.missed
      : [...progress.missed, answer.questionId];
  const gained = answer.correct ? XP_CORRECT : XP_WRONG;
  return {
    ...progress,
    seen,
    missed,
    xp: progress.xp + gained,
    daily: { ...progress.daily, xp: progress.daily.xp + gained },
  };
}

export interface LessonResult {
  score: number;
  total: number;
}

export interface LessonOutcome {
  progress: Progress;
  /** XP from the lesson bonus (and the daily goal, if it was completed now). Answers were paid one by one. */
  bonusXp: number;
  goalCompleted: boolean;
}

/** Records a finished lesson: bonus XP, perfect-lesson bonus and the daily goal. */
export function applyLesson(progress: Progress, result: LessonResult): LessonOutcome {
  const perfect = result.total > 0 && result.score === result.total;
  const bonus = XP_LESSON + (perfect ? XP_PERFECT : 0);
  const counted: Progress = {
    ...progress,
    xp: progress.xp + bonus,
    lessonsCompleted: progress.lessonsCompleted + 1,
    perfectLessons: progress.perfectLessons + (perfect ? 1 : 0),
    daily: { ...progress.daily, lessons: progress.daily.lessons + 1, xp: progress.daily.xp + bonus },
  };
  const settled = settleGoal(counted);
  return {
    progress: settled.progress,
    bonusXp: bonus + (settled.goalCompleted ? XP_GOAL : 0),
    goalCompleted: settled.goalCompleted,
  };
}

export interface WordsOutcome {
  progress: Progress;
  xp: number;
  goalCompleted: boolean;
}

/** Records reviewed words: XP for the right ones, and progress toward the daily goal. */
export function applyWordsReviewed(progress: Progress, review: { correct: number; total: number }): WordsOutcome {
  const xp = review.correct * XP_WORD;
  const counted: Progress = {
    ...progress,
    xp: progress.xp + xp,
    daily: { ...progress.daily, words: progress.daily.words + review.total, xp: progress.daily.xp + xp },
  };
  const settled = settleGoal(counted);
  return {
    progress: settled.progress,
    xp: xp + (settled.goalCompleted ? XP_GOAL : 0),
    goalCompleted: settled.goalCompleted,
  };
}

/** How many of a category's questions the player has answered. */
export function categoryProgress(progress: Progress, categoryId: string, total: number) {
  const seen = Math.min(progress.seen[categoryId]?.length ?? 0, total);
  return { seen, total, complete: total > 0 && seen >= total, fraction: total > 0 ? seen / total : 0 };
}

export function seenSet(progress: Progress): Set<string> {
  return new Set(Object.values(progress.seen).flat());
}
