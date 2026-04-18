import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Question, GameState, GamePhase } from '@/types';
import { useStreak, type PlayResult } from './useStreak';

const QUESTIONS_PER_ROUND = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useGame(allQuestions: Question[]) {
  const { registerPlay } = useStreak();
  const [playResult, setPlayResult] = useState<PlayResult | null>(null);
  const hasRegistered = useRef(false);

  const roundQuestions = useMemo(
    () => shuffle(allQuestions).slice(0, QUESTIONS_PER_ROUND),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [state, setState] = useState<GameState>({
    questions: roundQuestions,
    currentIndex: 0,
    score: 0,
    phase: 'playing',
    selectedAnswer: null,
    isCorrect: null,
  });

  const total = state.questions.length;
  const currentQuestion = state.questions[state.currentIndex] ?? null;
  const isLastQuestion = state.currentIndex === total - 1;

  useEffect(() => {
    if (state.phase === 'finished' && !hasRegistered.current) {
      hasRegistered.current = true;
      setPlayResult(registerPlay());
    }
  }, [state.phase, registerPlay]);

  const selectAnswer = useCallback((answerIndex: number) => {
    setState((prev) => {
      if (prev.phase !== 'playing' || prev.selectedAnswer !== null) return prev;
      const correct = prev.questions[prev.currentIndex].correctIndex === answerIndex;
      return {
        ...prev,
        selectedAnswer: answerIndex,
        isCorrect: correct,
        score: correct ? prev.score + 1 : prev.score,
        phase: 'reflecting' as GamePhase,
      };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'reflecting') return prev;
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.questions.length) {
        return { ...prev, phase: 'finished' as GamePhase };
      }
      return {
        ...prev,
        currentIndex: nextIndex,
        phase: 'playing' as GamePhase,
        selectedAnswer: null,
        isCorrect: null,
      };
    });
  }, []);

  const finishGame = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'finished' }));
  }, []);

  return {
    ...state,
    currentQuestion,
    total,
    isLastQuestion,
    selectAnswer,
    nextQuestion,
    finishGame,
    playResult,
  };
}
