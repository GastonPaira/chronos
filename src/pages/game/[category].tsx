import type { GetStaticPaths, GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import type { Locale, Question } from '@/types';
import questionsData from '@/data/questions';
import { useGame } from '@/hooks/useGame';
import ScoreDisplay from '@/components/ScoreDisplay';
import QuestionCard from '@/components/QuestionCard';
import ReflectionPanel from '@/components/ReflectionPanel';
import ResultScreen from '@/components/ResultScreen';
import LanguageSelector from '@/components/LanguageSelector';
import ChronosLogo from '@/components/ChronosLogo';
import StreakDisplay from '@/components/StreakDisplay';

interface Props {
  categoryQuestions: Question[];
  categoryId: string;
}

export default function GamePage({ categoryQuestions, categoryId }: Props) {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const locale = (i18n.language as Locale) ?? 'en';

  const {
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
    playResult,
  } = useGame(categoryQuestions);

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
      <header className="flex items-center justify-between max-w-2xl mx-auto w-full mb-8">
        <button
          onClick={() => router.push('/categories')}
          className="flex items-center gap-1.5 text-sm text-chronos-muted hover:text-chronos-text transition-colors"
        >
          ← {t('nav.back')}
        </button>
        <ChronosLogo size="sm" />
        <LanguageSelector />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {phase === 'finished' ? (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <StreakDisplay context="game_end" playResult={playResult ?? undefined} />
            <ResultScreen score={score} total={total} category={categoryId} />
          </div>
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
                  locale={locale}
                  selectedAnswer={selectedAnswer}
                  onAnswer={selectAnswer}
                />
              )}

              {phase === 'reflecting' && currentQuestion && (
                <>
                  {/* Compact answered question recap */}
                  <div className="mb-4 p-4 rounded-xl border border-chronos-border bg-chronos-surface">
                    <p className="text-sm text-chronos-muted mb-2 font-medium">
                      {currentQuestion.question[locale]}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        selectedAnswer === currentQuestion.correctIndex
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                    >
                      {selectedAnswer === currentQuestion.correctIndex
                        ? `✓ ${t('game.correct')}`
                        : `✗ ${t('game.incorrect')}`}{' '}
                      — {currentQuestion.options[currentQuestion.correctIndex][locale]}
                    </p>
                  </div>

                  <ReflectionPanel
                    question={currentQuestion}
                    locale={locale}
                    isLast={isLastQuestion}
                    onContinue={isLastQuestion ? finishGame : nextQuestion}
                  />
                </>
              )}
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
