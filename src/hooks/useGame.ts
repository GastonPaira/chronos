// Hook principal del juego individual: maneja estado, progreso, respuestas y racha.

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Question, GameState, GamePhase } from '@/types';
import { buildRound } from '@/lib/questions';
import { useStreak, type PlayResult } from './useStreak';
import { useStats } from './useStats';

const QUESTIONS_PER_ROUND = 10;

const emptyState = (questions: Question[]): GameState => ({
  questions,
  currentIndex: 0,
  score: 0,
  phase: 'playing',
  selectedAnswer: null,
  isCorrect: null,
});

/** Options for `useGame`. */
export interface UseGameOptions {
  /** Blog story whose questions should open the round (from `?story=`). */
  storyId?: string;
  /** `false` until the router query is available; the round is built after that. */
  ready?: boolean;
}

/**
 * Manages all state for a single-player trivia game session.
 *
 * Once `ready`, the hook picks `QUESTIONS_PER_ROUND` questions at random from
 * `allQuestions` (the `storyId` questions first) and shuffles their options.
 * The round is built on the client only, so the static HTML and the first
 * client render match (no hydration mismatch from `Math.random`).
 *
 * Stats and streak data are recorded automatically via side effects:
 * - Each answer is recorded to `useStats` when the phase transitions to `'reflecting'`.
 * - Streak and session stats are recorded once when the phase reaches `'finished'`.
 *
 * @param allQuestions - The full pool of questions for the selected category.
 * @param options - `storyId` and `ready`; see `UseGameOptions`.
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
export function useGame(allQuestions: Question[], { storyId, ready = true }: UseGameOptions = {}) {
  const { registerPlay } = useStreak();
  const { recordAnswer, recordSessionEnd } = useStats();
  const [playResult, setPlayResult] = useState<PlayResult | null>(null);
  const hasRegistered = useRef(false);
  const lastRecordedIndex = useRef(-1);

  const [state, setState] = useState<GameState>(() => emptyState([]));

  const startRound = useCallback(() => {
    hasRegistered.current = false;
    lastRecordedIndex.current = -1;
    setPlayResult(null);
    setState(emptyState(buildRound(allQuestions, QUESTIONS_PER_ROUND, storyId)));
  }, [allQuestions, storyId]);

  // Build the first round on the client once the query string is known.
  useEffect(() => {
    if (ready) startRound();
  }, [ready, startRound]);

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
   * @param answerIndex - Index of the option the user tapped.
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
   * Resets the game to a brand-new shuffled round (same as `startRound`).
   * Clears streak/stats registration guards so they fire again at the end of the new round.
   */
  const resetGame = startRound;

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
