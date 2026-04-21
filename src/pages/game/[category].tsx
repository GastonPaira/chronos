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
import { AuthButton } from '@/components/AuthButton';

const CATEGORY_IMAGES: Record<string, string> = {
  'ancient-egypt':    '/images/ancient-egypt.jpg',
  'ancient-greece':   '/images/ancient-greece.jpg',
  'roman-empire':     '/images/roman-empire.jpg',
  'byzantine-empire': '/images/byzantine-empire.jpg',
  'crusades-chivalry':'/images/crusades-chivalry.jpg',
  'vikings':          '/images/vikings.jpg',
};

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
    resetGame,
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
          <LanguageSelector />
          <AuthButton />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {phase === 'finished' ? (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <StreakDisplay context="game_end" playResult={playResult ?? undefined} />
            <ResultScreen score={score} total={total} category={categoryId} onPlayAgain={resetGame} />
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

              {phase === 'reflecting' && currentQuestion && (() => {
                const bgImage = CATEGORY_IMAGES[currentQuestion.category];
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

                    <div className="relative z-10 p-4 pt-0">
                      <ReflectionPanel
                        question={currentQuestion}
                        locale={locale}
                        isLast={isLastQuestion}
                        onContinue={isLastQuestion ? finishGame : nextQuestion}
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
