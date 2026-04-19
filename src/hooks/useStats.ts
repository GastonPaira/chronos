import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, getDeviceId } from '@/lib/supabase';

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

export function useStats() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const statsRef = useRef<Stats>(makeEmptyStats());

  useEffect(() => {
    setMounted(true);
    const deviceId = getDeviceId();
    if (!deviceId) { setStats(makeEmptyStats()); return; }

    supabase
      .from('user_stats')
      .select('data')
      .eq('device_id', deviceId)
      .maybeSingle()
      .then(({ data }) => {
        const loaded = (data?.data as Stats | undefined) ?? makeEmptyStats();
        statsRef.current = loaded;
        setStats(loaded);
      });
  }, []);

  const persist = useCallback((updated: Stats) => {
    statsRef.current = updated;
    setStats(updated);
    const deviceId = getDeviceId();
    if (!deviceId) return;
    supabase
      .from('user_stats')
      .upsert({ device_id: deviceId, data: updated, updated_at: new Date().toISOString() })
      .then();
  }, []);

  const recordAnswer = useCallback((params: {
    categoryId: string;
    difficulty: 'easy' | 'medium' | 'hard';
    isCorrect: boolean;
  }) => {
    const current = statsRef.current;
    const today = new Date().toISOString().split('T')[0];
    const prev = current.byCategory[params.categoryId] ?? { answered: 0, correct: 0, lastPlayed: today };

    persist({
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
    });
  }, [persist]);

  const recordSessionEnd = useCallback((params: { score: number; total: number }) => {
    const current = statsRef.current;
    persist({
      ...current,
      global: {
        ...current.global,
        sessionsCompleted: current.global.sessionsCompleted + 1,
        perfectSessions: current.global.perfectSessions + (params.score === params.total ? 1 : 0),
        bestScore: Math.max(current.global.bestScore, params.score),
      },
    });
  }, [persist]);

  const resetStats = useCallback(() => {
    persist(makeEmptyStats());
  }, [persist]);

  const getAccuracy = useCallback((): number => {
    const s = statsRef.current;
    if (!s.global.totalAnswered) return 0;
    return Math.round((s.global.totalCorrect / s.global.totalAnswered) * 100);
  }, []);

  const getCategoryAccuracy = useCallback((id: string): number => {
    const cat = statsRef.current.byCategory[id];
    if (!cat?.answered) return 0;
    return Math.round((cat.correct / cat.answered) * 100);
  }, []);

  const getDifficultyAccuracy = useCallback((d: string): number => {
    const diff = statsRef.current.byDifficulty[d as 'easy' | 'medium' | 'hard'];
    if (!diff?.answered) return 0;
    return Math.round((diff.correct / diff.answered) * 100);
  }, []);

  const getStrongestCategory = useCallback((): string | null => {
    const sorted = Object.entries(statsRef.current.byCategory)
      .filter(([, v]) => v.answered >= 5)
      .sort((a, b) => (b[1].correct / b[1].answered) - (a[1].correct / a[1].answered));
    return sorted[0]?.[0] ?? null;
  }, []);

  const getWeakestCategory = useCallback((): string | null => {
    const sorted = Object.entries(statsRef.current.byCategory)
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
