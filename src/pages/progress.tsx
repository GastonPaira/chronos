// "Mi progreso": nivel, XP, meta diaria y logros.

import { useMemo } from 'react';
import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import type { Question } from '@/types';
import questionsData from '@/data/questions';
import { useAchievementInfo } from '@/hooks/useAchievementInfo';
import { useProgress } from '@/hooks/useProgress';
import { useStreak } from '@/hooks/useStreak';
import { useWords } from '@/hooks/useWords';
import { ACHIEVEMENTS, categoryAchievementId, earnedAchievements } from '@/lib/achievements';
import { GOAL_LESSONS, GOAL_WORDS, levelFor } from '@/lib/progress';
import { AuthButton } from '@/components/AuthButton';
import LanguageSelector from '@/components/LanguageSelector';
import LevelBar from '@/components/LevelBar';
import SoundToggle from '@/components/SoundToggle';

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-chronos-card border border-chronos-border p-4 flex flex-col gap-1">
      <span className="text-xs text-chronos-muted uppercase tracking-widest">{label}</span>
      <span className="text-2xl font-medium text-chronos-text tabular-nums">{value}</span>
    </div>
  );
}

export default function ProgressPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { progress, level } = useProgress();
  const { currentStreak } = useStreak();
  const { learned } = useWords();
  const achievementInfo = useAchievementInfo();

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const q of questionsData as Question[]) totals[q.category] = (totals[q.category] ?? 0) + 1;
    return totals;
  }, []);

  const ids = useMemo(
    () => [...ACHIEVEMENTS.map(a => a.id), ...Object.keys(categoryTotals).map(categoryAchievementId)],
    [categoryTotals],
  );
  const earned = useMemo(
    () =>
      progress
        ? new Set([...earnedAchievements({ progress, streak: currentStreak, learnedWords: learned, categoryTotals }), ...Object.keys(progress.achievements)])
        : new Set<string>(),
    [progress, currentStreak, learned, categoryTotals],
  );

  const nextLevel = levelFor(progress?.xp ?? 0);

  return (
    <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex items-center px-2 h-12 relative bg-[#09090f] border-b border-white/5 mb-8 w-full">
        <button
          onClick={() => router.push('/')}
          aria-label={t('nav.back')}
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

      <div className="max-w-2xl mx-auto mb-6 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-chronos-text">{t('progress.title')}</h2>
        <div className="mt-2 h-0.5 w-12 bg-chronos-gold rounded-full" />
      </div>

      {progress && (
        <main className="max-w-2xl mx-auto flex flex-col gap-6 animate-slide-up">
          {/* Level */}
          <div className="rounded-2xl border border-chronos-gold/30 bg-chronos-gold/5 p-5 flex flex-col gap-3">
            <LevelBar level={level} />
            <p className="text-xs text-chronos-muted">
              {t('progress.xpTotal', { xp: progress.xp })} ·{' '}
              {t('progress.toNext', { xp: nextLevel.xpForLevel - nextLevel.xpIntoLevel, level: nextLevel.level + 1 })}
            </p>
          </div>

          {/* Today */}
          <div className="rounded-xl border border-chronos-border bg-chronos-card p-4 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-chronos-muted">{t('daily.title')}</p>
            <p className="text-sm text-chronos-text">
              {progress.daily.lessons >= GOAL_LESSONS ? '✓' : '○'} {t('daily.lesson')}
              <span className="mx-3 text-chronos-border">|</span>
              {progress.daily.words >= GOAL_WORDS ? '✓' : '○'} {t('daily.words', { count: GOAL_WORDS })} ({Math.min(progress.daily.words, GOAL_WORDS)}/{GOAL_WORDS})
            </p>
            {progress.daily.goalDone && <p className="text-sm font-semibold text-emerald-400">🏅 {t('daily.complete')}</p>}
          </div>

          {/* Numbers */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t('progress.lessons')} value={progress.lessonsCompleted} />
            <Stat label={t('progress.perfect')} value={progress.perfectLessons} />
            <Stat label={t('progress.goalDays')} value={progress.goalDays} />
            <Stat label={t('progress.words')} value={learned} />
          </div>

          {/* Achievements */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-widest text-chronos-muted">
              {t('progress.achievements')} · {ids.filter(id => earned.has(id)).length}/{ids.length}
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ids.map(id => {
                const info = achievementInfo(id);
                const unlocked = earned.has(id);
                return (
                  <li
                    key={id}
                    className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
                      unlocked ? 'border-chronos-gold/40 bg-chronos-gold/5' : 'border-chronos-border bg-chronos-card opacity-50'
                    }`}
                  >
                    <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{unlocked ? info.icon : '🔒'}</span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-chronos-text">{info.title}</span>
                      <span className="text-xs text-chronos-muted">{info.desc}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <button
            type="button"
            onClick={() => router.push('/stats')}
            className="w-full rounded-2xl border border-chronos-border bg-transparent px-8 py-3 text-chronos-muted text-sm font-medium tracking-widest uppercase transition-all hover:border-chronos-gold/40 hover:text-chronos-text active:scale-[0.97]"
          >
            {t('progress.viewStats')}
          </button>
        </main>
      )}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
