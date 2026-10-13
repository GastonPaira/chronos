import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import type { Question, VocabEntry } from '@/types';
import questionsData from '@/data/questions';
import { getCategoryImage } from '@/data/catalog';
import { useGame } from '@/hooks/useGame';
import { useWords } from '@/hooks/useWords';
import { getProgress, useProgress, type LessonRewards } from '@/hooks/useProgress';
import { XP_CORRECT, levelFor } from '@/lib/progress';
import { playComplete, playLevelUp } from '@/lib/sounds';
import { buildReview, type ReviewItem } from '@/lib/vocab';
import { wordKey, type ReviewResult } from '@/lib/words';
import ScoreDisplay from '@/components/ScoreDisplay';
import QuestionCard from '@/components/QuestionCard';
import ReflectionPanel from '@/components/ReflectionPanel';
import ResultScreen, { type EnglishResult } from '@/components/ResultScreen';
import VocabReview from '@/components/VocabReview';
import GlossedText from '@/components/GlossedText';
import LanguageSelector from '@/components/LanguageSelector';
import ChronosLogo from '@/components/ChronosLogo';
import StreakDisplay from '@/components/StreakDisplay';
import { AuthButton } from '@/components/AuthButton';
import Celebration from '@/components/Celebration';
import SoundToggle from '@/components/SoundToggle';

/** Words in the review that follows a lesson (the daily review has more). */
const LESSON_REVIEW_SIZE = 3;

interface Props {
  categoryQuestions: Question[];
  categoryId: string;
}

export default function GamePage({ categoryQuestions, categoryId }: Props) {
  const { t } = useTranslation('common');
  const router = useRouter();
  // ?story=antikythera → the round opens with that blog story's questions.
  const storyId = typeof router.query.story === 'string' ? router.query.story : undefined;

  const {
    questions,
    currentQuestion,
    currentIndex,
    total,
    score,
    phase,
    selectedAnswer,
    isLastQuestion,
    selectAnswer,
    nextQuestion,
    finishGame,
    resetGame,
    playResult,
    lesson,
    streak: currentStreak,
  } = useGame(categoryQuestions, { storyId, ready: router.isReady });

  // End-of-round vocabulary review: built once when the round finishes (null = not built yet).
  const { store: wordStore, learned: learnedWords, recordReview } = useWords();
  const { progress, level, recordWords, unlockAchievements } = useProgress();
  const [wordsGoalCompleted, setWordsGoalCompleted] = useState(false);
  const [rewards, setRewards] = useState<LessonRewards | null>(null);
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const q of questionsData as Question[]) totals[q.category] = (totals[q.category] ?? 0) + 1;
    return totals;
  }, []);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [review, setReview] = useState<ReviewItem[] | null>(null);
  const [reviewDone, setReviewDone] = useState(false);
  const [english, setEnglish] = useState<EnglishResult | undefined>();

  const handleWordTap = useCallback(
    (entry: VocabEntry) => setTouched(prev => new Set(prev).add(wordKey(entry.term))),
    [],
  );

  useEffect(() => {
    if (phase !== 'finished' || !wordStore || review !== null) return;
    setReview(
      buildReview({
        roundQuestions: questions,
        allQuestions: questionsData as Question[],
        touched,
        store: wordStore,
        size: LESSON_REVIEW_SIZE,
      }),
    );
  }, [phase, wordStore, review, questions, touched]);

  // Once the lesson (and its word review, if any) is over: unlock achievements and work out what the player won.
  useEffect(() => {
    if (phase !== 'finished' || !lesson || review === null || rewards) return;
    if (review.length > 0 && !reviewDone) return;
    const achievements = unlockAchievements({ streak: currentStreak, learnedWords, categoryTotals });
    const xpEnd = getProgress()?.xp ?? lesson.xpAfter;
    const levelBefore = levelFor(lesson.startXp).level;
    const levelAfter = levelFor(xpEnd).level;
    const next: LessonRewards = {
      xp: xpEnd - lesson.startXp,
      levelUp: levelAfter > levelBefore ? levelAfter : null,
      goalCompleted: lesson.goalCompleted || wordsGoalCompleted,
      achievements,
    };
    setRewards(next);
    if (next.levelUp) playLevelUp();
    else playComplete();
  }, [phase, lesson, review, reviewDone, rewards, currentStreak, learnedWords, categoryTotals, wordsGoalCompleted, unlockAchievements]);

  const handleReviewDone = (results: ReviewResult[]) => {
    const newWords = recordReview(results);
    if (results.length > 0) {
      const correct = results.filter(r => r.correct).length;
      setEnglish({ correct, total: results.length, newWords });
      const outcome = recordWords({ correct, total: results.length });
      setWordsGoalCompleted(outcome.goalCompleted);
    }
    setReviewDone(true);
  };

  const handlePlayAgain = () => {
    setTouched(new Set());
    setReview(null);
    setReviewDone(false);
    setEnglish(undefined);
    setRewards(null);
    setWordsGoalCompleted(false);
    resetGame();
  };

  if (!currentQuestion && phase !== 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chronos-bg text-chronos-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chronos-bg px-4 py-6 sm:px-6 sm:py-10 flex flex-col">
      {/* Header */}
      <header className="flex items-center px-2 h-12 relative bg-[#09090f] border-b border-white/5 mb-8 w-full">
        <button
          onClick={() => router.push(router.query.era ? `/categories?era=${router.query.era}` : '/categories')}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,2 4,7 9,12" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 ml-auto">
          <SoundToggle />
          <LanguageSelector />
          <AuthButton />
        </div>
      </header>

      {rewards && (rewards.levelUp || rewards.goalCompleted || rewards.achievements.length > 0) && (
        <Celebration burstKey={`${rewards.xp}-${rewards.achievements.join()}`} />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {phase === 'finished' ? (
          review === null ? null : review.length > 0 && !reviewDone ? (
            <VocabReview items={review} onDone={handleReviewDone} />
          ) : (
            <div className="flex flex-col items-center gap-6 animate-fade-in">
              <StreakDisplay context="game_end" playResult={playResult ?? undefined} />
              <ResultScreen
                score={score}
                total={total}
                category={categoryId}
                onPlayAgain={handlePlayAgain}
                english={english}
                rewards={rewards && progress ? { lesson: rewards, level, daily: progress.daily } : undefined}
              />
            </div>
          )
        ) : (
          <>
            {/* Score bar */}
            <div className="mb-6">
              <ScoreDisplay
                score={score}
                current={currentIndex}
                total={total}
              />
            </div>

            {/* Question or Reflection */}
            <div className="flex-1 flex flex-col">
              {phase === 'playing' && currentQuestion && (
                <QuestionCard
                  question={currentQuestion}
                  selectedAnswer={selectedAnswer}
                  onAnswer={selectAnswer}
                  onWordTap={handleWordTap}
                />
              )}

              {phase === 'reflecting' && currentQuestion && (() => {
                const bgImage = getCategoryImage(currentQuestion.category);
                return (
                  <div className="relative rounded-2xl overflow-hidden flex flex-col gap-4">
                    {/* Category background image — same as QuestionCard */}
                    {bgImage && (
                      <div
                        className="pointer-events-none absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${bgImage})` }}
                      />
                    )}
                    {bgImage && (
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{ background: 'rgba(9,9,15,0.88)' }}
                      />
                    )}

                    {/* Compact answered question recap */}
                    <div className="relative z-10 p-4 rounded-xl border border-chronos-border bg-chronos-surface/60">
                      <p lang="en" className="text-sm text-chronos-muted mb-2 font-medium">
                        {currentQuestion.question.en}
                      </p>
                      <div
                        className={`flex flex-col gap-1 text-sm font-semibold ${
                          selectedAnswer === currentQuestion.correctIndex
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        <p className="animate-pop">
                          {selectedAnswer === currentQuestion.correctIndex
                            ? `✓ ${t('game.correct')}`
                            : `✗ ${t('game.incorrect')}`}
                          {selectedAnswer === currentQuestion.correctIndex && (
                            <span className="ml-2 inline-block text-xs font-bold text-chronos-gold animate-float-up">
                              +{XP_CORRECT} XP
                            </span>
                          )}
                        </p>
                        <GlossedText
                          text={currentQuestion.options[currentQuestion.correctIndex].en}
                          vocab={currentQuestion.vocab}
                          onWordTap={handleWordTap}
                          className="font-medium"
                        />
                      </div>
                    </div>

                    <div className="relative z-10 p-4 pt-0">
                      <ReflectionPanel
                        question={currentQuestion}
                        isLast={isLastQuestion}
                        onContinue={isLastQuestion ? finishGame : nextQuestion}
                        onWordTap={handleWordTap}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const questions = questionsData as Question[];
  const categories = [...new Set(questions.map((q) => q.category))];
  const locales = ['en', 'es'];

  const paths = categories.flatMap((category) =>
    locales.map((locale) => ({ params: { category }, locale }))
  );

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params, locale }) => {
  const categoryId = params?.category as string;
  const questions = questionsData as Question[];
  const categoryQuestions = questions.filter((q) => q.category === categoryId);

  return {
    props: {
      categoryQuestions,
      categoryId,
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
