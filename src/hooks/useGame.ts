import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Question, GameState, GamePhase } from '@/types';
import { useStreak, type PlayResult } from './useStreak';
import { useStats } from './useStats';

const QUESTIONS_PER_ROUND = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleOptions(q: Question): Question {
  if (Math.random() < 0.5) return q;
  return {
    ...q,
    options: [q.options[1], q.options[0]],
    correctIndex: q.correctIndex === 0 ? 1 : 0,
  };
}

export function useGame(allQuestions: Question[]) {
  const { registerPlay } = useStreak();
  const { recordAnswer, recordSessionEnd } = useStats();
  const [playResult, setPlayResult] = useState<PlayResult | null>(null);
  const hasRegistered = useRef(false);
  const lastRecordedIndex = useRef(-1);

  const roundQuestions = useMemo(
    () => shuffle(allQuestions).slice(0, QUESTIONS_PER_ROUND).map(shuffleOptions),
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
    if (
      state.phase === 'reflecting' &&
      state.isCorrect !== null &&
      state.currentIndex !== lastRecordedIndex.current
    ) {
      const q = state.questions[state.currentIndex];
      if (q) {
        lastRecordedIndex.current = state.currentIndex;
        recordAnswer({
          categoryId: q.category,
          difficulty: q.difficulty,
          isCorrect: state.isCorrect,
        });
      }
    }
  }, [state.phase, state.currentIndex, state.isCorrect, state.questions, recordAnswer]);

  useEffect(() => {
    if (state.phase === 'finished' && !hasRegistered.current) {
      hasRegistered.current = true;
      setPlayResult(registerPlay());
      recordSessionEnd({ score: state.score, total: state.questions.length });
    }
  }, [state.phase, registerPlay, recordSessionEnd, state.score, state.questions.length]);

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

  const resetGame = useCallback(() => {
    hasRegistered.current = false;
    lastRecordedIndex.current = -1;
    setPlayResult(null);
    setState({
      questions: shuffle(allQuestions).slice(0, QUESTIONS_PER_ROUND).map(shuffleOptions),
      currentIndex: 0,
      score: 0,
      phase: 'playing',
      selectedAnswer: null,
      isCorrect: null,
    });
  }, [allQuestions]);

  return {
    ...state,
    currentQuestion,
    total,
    isLastQuestion,
    selectAnswer,
    nextQuestion,
    finishGame,
    resetGame,
    playResult,
  };
}
