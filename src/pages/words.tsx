// "Mis palabras": las palabras que el jugador está aprendiendo y las que ya aprendió, y el repaso diario.

import { useCallback, useMemo, useState } from 'react';
import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import type { Question } from '@/types';
import questionsData from '@/data/questions';
import { useProgress, type LessonRewards } from '@/hooks/useProgress';
import { useStreak } from '@/hooks/useStreak';
import { useWords } from '@/hooks/useWords';
import { toLocalDateKey } from '@/lib/dates';
import { speakWord } from '@/lib/speakWord';
import { playComplete } from '@/lib/sounds';
import { buildDailyReview, collectVocab, type ReviewItem } from '@/lib/vocab';
import { LEARNED_STREAK, dueCount, isLearned, wordKey, type ReviewResult, type WordProgress } from '@/lib/words';
import { AuthButton } from '@/components/AuthButton';
import Celebration from '@/components/Celebration';
import LanguageSelector from '@/components/LanguageSelector';
import RewardsPanel from '@/components/RewardsPanel';
import VocabReview from '@/components/VocabReview';

const PAGE_SIZE = 40;

interface ReviewSummary {
  correct: number;
  total: number;
  newlyLearned: number;
  rewards: LessonRewards;
}

function WordRow({ word, example }: { word: WordProgress; example?: string }) {
  const { t } = useTranslation('common');
  return (
    <li className="rounded-xl border border-chronos-border bg-chronos-card px-4 py-3 flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <span lang="en" className="font-semibold text-chronos-text">{word.term}</span>
        <span className="text-chronos-muted">→</span>
        <span lang="es" className="text-chronos-gold">{word.es}</span>
        <button
          type="button"
          onClick={() => speakWord(word.term)}
          aria-label={t('vocab.listen')}
          title={t('vocab.listen')}
          className="ml-auto p-1 text-sm leading-none text-chronos-muted hover:text-chronos-gold transition-colors"
        >
          🔊
        </button>
        <span className="flex gap-1" aria-label={`${Math.min(word.streak, LEARNED_STREAK)}/${LEARNED_STREAK}`}>
          {Array.from({ length: LEARNED_STREAK }, (_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${i < word.streak ? 'bg-emerald-400' : 'bg-chronos-border'}`} />
          ))}
        </span>
      </div>
      {example && (
        <p lang="en" className="text-xs italic text-chronos-muted leading-relaxed">
          {t('words.example')}: {example}
        </p>
      )}
    </li>
  );
}

function WordList({ title, words, examples }: { title: string; words: WordProgress[]; examples: Map<string, string> }) {
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(PAGE_SIZE);
  if (words.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs uppercase tracking-widest text-chronos-muted">
        {title} · {words.length}
      </h3>
      <ul className="flex flex-col gap-2">
        {words.slice(0, visible).map(word => (
          <WordRow key={word.term} word={word} example={examples.get(wordKey(word.term))} />
        ))}
      </ul>
      {visible < words.length && (
        <button
          type="button"
          onClick={() => setVisible(visible + PAGE_SIZE)}
          className="self-center text-xs text-chronos-muted underline underline-offset-2 hover:text-chronos-gold transition-colors"
        >
          {t('words.showMore')}
        </button>
      )}
    </section>
  );
}

export default function WordsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { store, learned, recordReview } = useWords();
  const { progress, level, recordWords, unlockAchievements } = useProgress();
  const { currentStreak } = useStreak();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  const questions = questionsData as Question[];
  const today = toLocalDateKey();
  const examples = useMemo(
    () => new Map(collectVocab(questions).map(word => [wordKey(word.term), word.sentence])),
    [questions],
  );
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const q of questions) totals[q.category] = (totals[q.category] ?? 0) + 1;
    return totals;
  }, [questions]);

  const all = useMemo(() => Object.values(store ?? {}), [store]);
  const learning = useMemo(() => all.filter(word => !isLearned(word)).sort((a, b) => a.streak - b.streak), [all]);
  const known = useMemo(() => all.filter(isLearned).sort((a, b) => b.lastReviewed.localeCompare(a.lastReviewed)), [all]);
  const due = store ? dueCount(store, today) : 0;

  const startReview = useCallback(() => {
    if (!store) return;
    setSummary(null);
    setItems(buildDailyReview({ allQuestions: questions, store, today }));
  }, [store, questions, today]);

  const finishReview = (results: ReviewResult[]) => {
    const startXp = progress?.xp ?? 0;
    const newlyLearned = recordReview(results);
    const correct = results.filter(result => result.correct).length;
    const words = recordWords({ correct, total: results.length });
    const achievements = unlockAchievements({ streak: currentStreak, learnedWords: learned + newlyLearned, categoryTotals });
    setItems(null);
    setSummary({
      correct,
      total: results.length,
      newlyLearned,
      rewards: { xp: words.xpAfter - startXp, levelUp: null, goalCompleted: words.goalCompleted, achievements },
    });
    playComplete();
  };

  const goBack = () => {
    if (items || summary) {
      setItems(null);
      setSummary(null);
    } else {
      router.push('/');
    }
  };

  const header = (
    <header className="flex items-center px-2 h-12 relative bg-[#09090f] border-b border-white/5 mb-8 w-full">
      <button
        onClick={goBack}
        aria-label={t('nav.back')}
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
  );

  // Daily review in progress.
  if (items) {
    return (
      <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
        {header}
        <main className="max-w-2xl mx-auto">
          {items.length > 0 ? (
            <VocabReview items={items} onDone={finishReview} />
          ) : (
            <p className="text-center text-chronos-muted">{t('words.nothingToReview')}</p>
          )}
        </main>
      </div>
    );
  }

  // Review finished.
  if (summary) {
    return (
      <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
        {header}
        {(summary.rewards.goalCompleted || summary.rewards.achievements.length > 0) && (
          <Celebration burstKey={`${summary.rewards.xp}-${summary.rewards.achievements.join()}`} />
        )}
        <main className="max-w-2xl mx-auto flex flex-col items-center gap-6 text-center animate-fade-in">
          <span className="text-5xl animate-pop">📚</span>
          <h2 className="text-2xl font-bold text-chronos-text">{t('words.reviewDone')}</h2>
          <p className="text-chronos-muted">{t('words.reviewResult', { correct: summary.correct, total: summary.total })}</p>
          {summary.newlyLearned > 0 && (
            <p className="text-sky-300 font-semibold">{t('results.newWords', { count: summary.newlyLearned })}</p>
          )}
          {progress && <RewardsPanel rewards={summary.rewards} level={level} daily={progress.daily} />}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => router.push('/eras')}
              className="rounded-xl bg-chronos-gold px-5 py-3.5 text-chronos-bg font-semibold hover:bg-chronos-gold-light active:scale-[0.98] transition-all"
            >
              {t('words.startLesson')}
            </button>
            <button
              type="button"
              onClick={() => setSummary(null)}
              className="rounded-xl border border-chronos-border bg-chronos-card px-5 py-3.5 text-chronos-text font-medium hover:border-chronos-gold/40 active:scale-[0.98] transition-all"
            >
              {t('words.backToWords')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Word list.
  return (
    <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
      {header}

      <div className="max-w-2xl mx-auto mb-6 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-chronos-text">{t('words.title')}</h2>
        <div className="mt-2 h-0.5 w-12 bg-chronos-gold rounded-full" />
      </div>

      <main className="max-w-2xl mx-auto flex flex-col gap-6 animate-slide-up">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-chronos-card border border-chronos-border p-4 flex flex-col gap-1" style={{ borderLeft: '3px solid #38bdf8' }}>
            <span className="text-xs text-chronos-muted uppercase tracking-widest">{t('words.learned')}</span>
            <span className="text-3xl font-medium text-sky-300 tabular-nums">{known.length}</span>
          </div>
          <div className="rounded-xl bg-chronos-card border border-chronos-border p-4 flex flex-col gap-1">
            <span className="text-xs text-chronos-muted uppercase tracking-widest">{t('words.learning')}</span>
            <span className="text-3xl font-medium text-chronos-gold tabular-nums">{learning.length}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-chronos-gold/30 bg-chronos-gold/5 p-4 flex flex-col gap-3">
          <p className="text-sm text-chronos-text">
            {due > 0 ? t('words.due', { count: due }) : all.length > 0 ? t('words.nothingDue') : t('words.empty')}
          </p>
          <button
            type="button"
            onClick={startReview}
            disabled={!store}
            className="w-full rounded-xl bg-chronos-gold px-5 py-3.5 text-chronos-bg font-bold tracking-wider uppercase hover:bg-chronos-gold-light active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {due > 0 ? t('words.reviewCta') : t('words.learnNew')}
          </button>
          <p className="text-xs text-chronos-muted">{t('words.reviewHint')}</p>
        </div>

        <WordList title={t('words.learning')} words={learning} examples={examples} />
        <WordList title={t('words.learned')} words={known} examples={examples} />
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
