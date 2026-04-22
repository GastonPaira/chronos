// Hook principal del juego individual: maneja estado, progreso, respuestas y racha.

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Question, GameState, GamePhase } from '@/types';
import { useStreak, type PlayResult } from './useStreak';
import { useStats } from './useStats';

const QUESTIONS_PER_ROUND = 10;

/**
 * Fisher-Yates shuffle. Returns a new array; does not mutate the original.
 *
 * @param arr - Array to shuffle.
 * @returns A new array with the same elements in random order.
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Randomly swaps the two answer options of a question with 50% probability
 * so that the correct answer is not always in the same position.
 *
 * @param q - The original question.
 * @returns Either the original question or a new object with swapped options and updated `correctIndex`.
 */
function shuffleOptions(q: Question): Question {
  if (Math.random() < 0.5) return q;
  return {
    ...q,
    options: [q.options[1], q.options[0]],
    correctIndex: q.correctIndex === 0 ? 1 : 0,
  };
}

/**
 * Manages all state for a single-player trivia game session.
 *
 * On mount, the hook picks `QUESTIONS_PER_ROUND` questions at random from
 * `allQuestions`, shuffles each question's options, and sets the initial
 * `GameState`. Subsequent renders share the same question set until `resetGame`
 * is called.
 *
 * Stats and streak data are recorded automatically via side effects:
 * - Each answer is recorded to `useStats` when the phase transitions to `'reflecting'`.
 * - Streak and session stats are recorded once when the phase reaches `'finished'`.
 *
 * @param allQuestions - The full pool of questions for the selected category.
 *
 * @returns
 * - All fields from `GameState` spread directly.
 * - `currentQuestion` – the question currently on screen, or `null` between questions.
 * - `total` – total number of questions in this round.
 * - `isLastQuestion` – whether the user is on the final question.
 * - `selectAnswer(answerIndex)` – call when the user taps an answer. No-ops if already answered.
 * - `nextQuestion()` – advances to the next question or transitions to `'finished'`.
 * - `finishGame()` – immediately transitions to `'finished'` (used by the skip button).
 * - `resetGame()` – resets to a fresh shuffled round without unmounting the component.
 * - `playResult` – the streak outcome returned by `registerPlay` once the game finishes; `null` while playing.
 */
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

  // Record each answer exactly once when the phase enters 'reflecting'.
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

  // Register streak and session stats exactly once when the game finishes.
  useEffect(() => {
    if (state.phase === 'finished' && !hasRegistered.current) {
      hasRegistered.current = true;
      setPlayResult(registerPlay());
      recordSessionEnd({ score: state.score, total: state.questions.length });
    }
  }, [state.phase, registerPlay, recordSessionEnd, state.score, state.questions.length]);

  /**
   * Processes the player's answer selection.
   * Transitions the phase from `'playing'` to `'reflecting'` and updates the score.
   * No-ops if the phase is not `'playing'` or an answer was already selected.
   *
   * @param answerIndex - Index (0 or 1) of the option the user tapped.
   */
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

  /**
   * Advances to the next question or ends the game if the current question is the last.
   * No-ops if the phase is not `'reflecting'`.
   */
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

  /**
   * Immediately ends the game by setting the phase to `'finished'`.
   * Used when the user clicks a "Finish" button mid-round.
   */
  const finishGame = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'finished' }));
  }, []);

  /**
   * Resets the game to a brand-new shuffled round.
   * Clears streak/stats registration guards so they fire again at the end of the new round.
   */
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
