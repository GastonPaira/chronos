// Logros: medallas que se desbloquean al llegar a ciertas metas. Lógica pura y testeable.
// Los textos (título y descripción) están en los archivos de idioma: `achievements.<id>.title` / `.desc`.

import { categoryProgress, levelFor, type Progress } from '@/lib/progress';

export interface AchievementContext {
  progress: Progress;
  /** Current daily streak. */
  streak: number;
  learnedWords: number;
  /** Number of questions in each category. */
  categoryTotals: Record<string, number>;
}

export interface AchievementDef {
  id: string;
  icon: string;
  unlocked: (ctx: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_lesson', icon: '🌱', unlocked: c => c.progress.lessonsCompleted >= 1 },
  { id: 'perfect_lesson', icon: '🎯', unlocked: c => c.progress.perfectLessons >= 1 },
  { id: 'lessons_10', icon: '📚', unlocked: c => c.progress.lessonsCompleted >= 10 },
  { id: 'lessons_50', icon: '🏛️', unlocked: c => c.progress.lessonsCompleted >= 50 },
  { id: 'streak_3', icon: '🔥', unlocked: c => c.streak >= 3 },
  { id: 'streak_7', icon: '🔥', unlocked: c => c.streak >= 7 },
  { id: 'streak_30', icon: '🌋', unlocked: c => c.streak >= 30 },
  { id: 'words_10', icon: '💬', unlocked: c => c.learnedWords >= 10 },
  { id: 'words_50', icon: '🗣️', unlocked: c => c.learnedWords >= 50 },
  { id: 'words_100', icon: '🎓', unlocked: c => c.learnedWords >= 100 },
  { id: 'goal_7', icon: '🏅', unlocked: c => c.progress.goalDays >= 7 },
  { id: 'level_5', icon: '⭐', unlocked: c => levelFor(c.progress.xp).level >= 5 },
  { id: 'xp_1000', icon: '💎', unlocked: c => c.progress.xp >= 1000 },
];

/** Id of the achievement for finishing every question of a category. */
export const categoryAchievementId = (categoryId: string) => `category:${categoryId}`;

/** Ids of every achievement the player has earned in `ctx`, whether or not it was already saved. */
export function earnedAchievements(ctx: AchievementContext): string[] {
  const fixed = ACHIEVEMENTS.filter(a => a.unlocked(ctx)).map(a => a.id);
  const categories = Object.entries(ctx.categoryTotals)
    .filter(([id, total]) => categoryProgress(ctx.progress, id, total).complete)
    .map(([id]) => categoryAchievementId(id));
  return [...fixed, ...categories];
}

/** Achievements earned in `ctx` that are not in `progress.achievements` yet. */
export function newAchievements(ctx: AchievementContext): string[] {
  return earnedAchievements(ctx).filter(id => !(id in ctx.progress.achievements));
}
