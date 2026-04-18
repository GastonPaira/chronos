import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'chronos_stats';

interface CategoryStats {
  answered: number;
  correct: number;
  lastPlayed: string;
}

export interface Stats {
  global: {
    totalAnswered: number;
    totalCorrect: number;
    sessionsCompleted: number;
    perfectSessions: number;
    bestScore: number;
  };
  byCategory: Record<string, CategoryStats>;
  byDifficulty: {
    easy: { answered: number; correct: number };
    medium: { answered: number; correct: number };
    hard: { answered: number; correct: number };
  };
}

function makeEmptyStats(): Stats {
  return {
    global: { totalAnswered: 0, totalCorrect: 0, sessionsCompleted: 0, perfectSessions: 0, bestScore: 0 },
    byCategory: {},
    byDifficulty: {
      easy: { answered: 0, correct: 0 },
      medium: { answered: 0, correct: 0 },
      hard: { answered: 0, correct: 0 },
    },
  };
}

function readStorage(): Stats {
  if (typeof window === 'undefined') return makeEmptyStats();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeEmptyStats();
    return JSON.parse(raw) as Stats;
  } catch {
    return makeEmptyStats();
  }
}

function writeStorage(data: Stats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore write errors (e.g. private browsing quota)
  }
}

export function useStats() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setMounted(true);
    setStats(readStorage());
  }, []);

  const recordAnswer = useCallback((params: {
    categoryId: string;
    difficulty: 'easy' | 'medium' | 'hard';
    isCorrect: boolean;
  }) => {
    const current = readStorage();
    const today = new Date().toISOString().split('T')[0];
    const prev = current.byCategory[params.categoryId] ?? { answered: 0, correct: 0, lastPlayed: today };

    const updated: Stats = {
      ...current,
      global: {
        ...current.global,
        totalAnswered: current.global.totalAnswered + 1,
        totalCorrect: current.global.totalCorrect + (params.isCorrect ? 1 : 0),
      },
      byCategory: {
        ...current.byCategory,
        [params.categoryId]: {
          answered: prev.answered + 1,
          correct: prev.correct + (params.isCorrect ? 1 : 0),
          lastPlayed: today,
        },
      },
      byDifficulty: {
        ...current.byDifficulty,
        [params.difficulty]: {
          answered: current.byDifficulty[params.difficulty].answered + 1,
          correct: current.byDifficulty[params.difficulty].correct + (params.isCorrect ? 1 : 0),
        },
      },
    };

    writeStorage(updated);
    setStats(updated);
  }, []);

  const recordSessionEnd = useCallback((params: { score: number; total: number }) => {
    const current = readStorage();
    const updated: Stats = {
      ...current,
      global: {
        ...current.global,
        sessionsCompleted: current.global.sessionsCompleted + 1,
        perfectSessions: current.global.perfectSessions + (params.score === params.total ? 1 : 0),
        bestScore: Math.max(current.global.bestScore, params.score),
      },
    };
    writeStorage(updated);
    setStats(updated);
  }, []);

  const resetStats = useCallback(() => {
    const empty = makeEmptyStats();
    writeStorage(empty);
    setStats(empty);
  }, []);

  const getAccuracy = useCallback((): number => {
    const s = readStorage();
    if (!s.global.totalAnswered) return 0;
    return Math.round((s.global.totalCorrect / s.global.totalAnswered) * 100);
  }, []);

  const getCategoryAccuracy = useCallback((id: string): number => {
    const s = readStorage();
    const cat = s.byCategory[id];
    if (!cat?.answered) return 0;
    return Math.round((cat.correct / cat.answered) * 100);
  }, []);

  const getDifficultyAccuracy = useCallback((d: string): number => {
    const s = readStorage();
    const diff = s.byDifficulty[d as 'easy' | 'medium' | 'hard'];
    if (!diff?.answered) return 0;
    return Math.round((diff.correct / diff.answered) * 100);
  }, []);

  const getStrongestCategory = useCallback((): string | null => {
    const s = readStorage();
    const sorted = Object.entries(s.byCategory)
      .filter(([, v]) => v.answered >= 5)
      .sort((a, b) => (b[1].correct / b[1].answered) - (a[1].correct / a[1].answered));
    return sorted[0]?.[0] ?? null;
  }, []);

  const getWeakestCategory = useCallback((): string | null => {
    const s = readStorage();
    const sorted = Object.entries(s.byCategory)
      .filter(([, v]) => v.answered >= 5)
      .sort((a, b) => (a[1].correct / a[1].answered) - (b[1].correct / b[1].answered));
    return sorted[0]?.[0] ?? null;
  }, []);

  return {
    stats: mounted ? stats : null,
    recordAnswer,
    recordSessionEnd,
    resetStats,
    getAccuracy,
    getCategoryAccuracy,
    getDifficultyAccuracy,
    getStrongestCategory,
    getWeakestCategory,
  };
}
