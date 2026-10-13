// Hook de progreso: puntos, nivel, meta diaria, logros y qué preguntas ya vio el jugador.
// Se guarda en el dispositivo. Todos los componentes comparten un mismo estado (un store a nivel de módulo),
// así que lo que registra el juego se ve enseguida en el inicio, en "Mi progreso" y en las categorías.

import { useCallback, useSyncExternalStore } from 'react';
import { toLocalDateKey } from '@/lib/dates';
import { readLocal, writeLocal } from '@/lib/localStore';
import { newAchievements, type AchievementContext } from '@/lib/achievements';
import {
  applyAnswer,
  applyLesson,
  applyWordsReviewed,
  levelFor,
  makeEmptyProgress,
  rollDaily,
  type AnsweredQuestion,
  type LessonResult,
  type Progress,
} from '@/lib/progress';

const LOCAL_KEY = 'chronos_progress';

let state: Progress | null = null;
const listeners = new Set<() => void>();

/** Current progress, loaded from the device on first use. `null` on the server. */
export function getProgress(): Progress | null {
  if (typeof window === 'undefined') return null;
  if (!state) {
    const today = toLocalDateKey();
    state = rollDaily({ ...makeEmptyProgress(today), ...readLocal<Partial<Progress>>(LOCAL_KEY) }, today);
  }
  return state;
}

function commit(next: Progress): void {
  state = next;
  writeLocal(LOCAL_KEY, next);
  listeners.forEach(listener => listener());
}

/** The progress with the daily counters rolled to today. */
function current(): Progress {
  return rollDaily(getProgress() ?? makeEmptyProgress(toLocalDateKey()), toLocalDateKey());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** What a lesson gave the player, to show on the results screen. */
export interface LessonRewards {
  /** Total XP of the lesson: answers, completion bonus and daily goal. */
  xp: number;
  /** New level if the lesson made the player level up. */
  levelUp: number | null;
  goalCompleted: boolean;
  /** Ids of achievements unlocked by this lesson (see `src/lib/achievements.ts`). */
  achievements: string[];
}

/**
 * Player progress, shared by every component.
 *
 * @returns
 * - `progress` – current progress, or `null` until it is loaded on the client.
 * - `level` – level info derived from the XP.
 * - `recordAnswer(answer)` – marks a question as seen and pays XP.
 * - `completeLesson(result)` – records a finished lesson; returns the bonus XP and whether the daily goal was just met.
 * - `recordWords(review)` – records reviewed words; same return shape.
 * - `unlockAchievements(ctx)` – saves and returns the achievements earned now that were not unlocked before.
 * - `markOnboarded()` – the player has seen the welcome screens.
 */
export function useProgress() {
  const progress = useSyncExternalStore(subscribe, getProgress, () => null);

  const recordAnswer = useCallback((answer: AnsweredQuestion) => {
    commit(applyAnswer(current(), answer));
  }, []);

  const completeLesson = useCallback((result: LessonResult) => {
    const outcome = applyLesson(current(), result);
    commit(outcome.progress);
    return { bonusXp: outcome.bonusXp, goalCompleted: outcome.goalCompleted, xpAfter: outcome.progress.xp };
  }, []);

  const recordWords = useCallback((review: { correct: number; total: number }) => {
    const outcome = applyWordsReviewed(current(), review);
    commit(outcome.progress);
    return { xp: outcome.xp, goalCompleted: outcome.goalCompleted, xpAfter: outcome.progress.xp };
  }, []);

  const unlockAchievements = useCallback((ctx: Omit<AchievementContext, 'progress'>): string[] => {
    const now = current();
    const fresh = newAchievements({ ...ctx, progress: now });
    if (fresh.length > 0) {
      const today = toLocalDateKey();
      commit({ ...now, achievements: { ...now.achievements, ...Object.fromEntries(fresh.map(id => [id, today])) } });
    }
    return fresh;
  }, []);

  const markOnboarded = useCallback(() => {
    commit({ ...current(), onboarded: true });
  }, []);

  return {
    progress,
    level: levelFor(progress?.xp ?? 0),
    recordAnswer,
    completeLesson,
    recordWords,
    unlockAchievements,
    markOnboarded,
  };
}
