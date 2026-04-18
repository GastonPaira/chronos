import { useState, useMemo, useEffect } from 'react';
import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import type { Locale, Question } from '@/types';
import questionsData from '@/data/questions.json';
import ChronosLogo from '@/components/ChronosLogo';
import LanguageSelector from '@/components/LanguageSelector';
import StreakBadge from '@/components/StreakBadge';
import { useStats } from '@/hooks/useStats';
import { useStreak } from '@/hooks/useStreak';

const CATEGORY_ICONS: Record<string, string> = {
  'ancient-egypt':    '𓂀',
  'ancient-greece':   '🏛️',
  'roman-empire':     '⚔️',
  'byzantine-empire': '🏰',
  'crusades-chivalry':'⚜️',
  'vikings':          '🪓',
  'renaissance':      '🎨',
  'world-wars':       '🌍',
  'space-race':       '🚀',
};

export default function StatsPage() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const locale = (i18n.language as Locale) ?? 'en';

  const {
    stats,
    resetStats,
    getAccuracy,
    getCategoryAccuracy,
    getDifficultyAccuracy,
    getStrongestCategory,
    getWeakestCategory,
  } = useStats();

  const { currentStreak, getStreakStatus } = useStreak();
  const [streakMounted, setStreakMounted] = useState(false);
  useEffect(() => setStreakMounted(true), []);

  const [showResetModal, setShowResetModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const categoryLabels = useMemo(() => {
    const map: Record<string, { en: string; es: string }> = {};
    for (const q of questionsData as Question[]) {
      if (!map[q.category]) map[q.category] = q.category_label;
    }
    return map;
  }, []);

  function getCategoryLabel(id: string): string {
    return categoryLabels[id]?.[locale] ?? id;
  }

  function handleReset() {
    resetStats();
    setShowResetModal(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }

  // ── Empty state ──────────────────────────────────────────────
  if (stats !== null && stats.global.totalAnswered === 0) {
    return (
      <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-center justify-between max-w-2xl mx-auto mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-sm text-chronos-muted hover:text-chronos-text transition-colors"
          >
            ← {t('nav.back')}
          </button>
          <ChronosLogo size="sm" />
          <div className="flex items-center gap-3">
            <StreakBadge />
            <LanguageSelector />
          </div>
        </header>

        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-6 py-20 animate-fade-in text-center">
          <span className="text-6xl">🕰️</span>
          <h2 className="text-2xl font-bold text-chronos-text">{t('stats.empty.title')}</h2>
          <p className="text-chronos-muted text-base max-w-xs">{t('stats.empty.subtitle')}</p>
          <button
            onClick={() => router.push('/eras')}
            className="rounded-2xl bg-chronos-gold px-8 py-4 text-chronos-bg font-bold text-base tracking-widest uppercase transition-all duration-200 hover:bg-chronos-gold-light active:scale-[0.97]"
          >
            {t('stats.empty.cta')}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading (not yet hydrated) ───────────────────────────────
  if (stats === null) {
    return (
      <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-center justify-between max-w-2xl mx-auto mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-sm text-chronos-muted hover:text-chronos-text transition-colors"
          >
            ← {t('nav.back')}
          </button>
          <ChronosLogo size="sm" />
          <div className="flex items-center gap-3">
            <StreakBadge />
            <LanguageSelector />
          </div>
        </header>
      </div>
    );
  }

  // ── Derived data ─────────────────────────────────────────────
  const accuracy = getAccuracy();
  const totalWrong = stats.global.totalAnswered - stats.global.totalCorrect;
  const correctPct = stats.global.totalAnswered
    ? Math.round((stats.global.totalCorrect / stats.global.totalAnswered) * 100)
    : 0;

  const playedCategories = Object.entries(stats.byCategory)
    .filter(([, v]) => v.answered > 0)
    .sort((a, b) => b[1].answered - a[1].answered);

  const strongestId = getStrongestCategory();
  const weakestId = getWeakestCategory();
  const hasInsight = strongestId !== null && weakestId !== null;

  const streakStatus = streakMounted ? getStreakStatus() : null;
  const showMotivation = streakMounted && currentStreak >= 3 && streakStatus === 'active_today';

  return (
    <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">

      {/* Header */}
      <header className="flex items-center justify-between max-w-2xl mx-auto mb-8">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm text-chronos-muted hover:text-chronos-text transition-colors"
        >
          ← {t('nav.back')}
        </button>
        <ChronosLogo size="sm" />
        <div className="flex items-center gap-3">
          <StreakBadge />
          <LanguageSelector />
        </div>
      </header>

      {/* Title */}
      <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-chronos-text">{t('stats.title')}</h2>
        <div className="mt-2 h-0.5 w-12 bg-chronos-gold rounded-full" />
      </div>

      <main className="max-w-2xl mx-auto flex flex-col gap-6 animate-slide-up">

        {/* ── a) Current Stats block ── */}
        {streakMounted && currentStreak > 0 && (
          <div className="rounded-xl border border-chronos-border bg-chronos-card px-4 py-4"
               style={{ borderLeft: '3px solid #f59e0b' }}>
            <p className="text-xs text-chronos-muted uppercase tracking-widest mb-3">
              {t('stats.currentStats')}
            </p>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <span className="text-chronos-gold font-semibold text-sm">
                  {currentStreak}-day streak
                </span>
              </div>
              <div className="text-sm text-chronos-muted">
                {stats.global.sessionsCompleted} {t('stats.sessions').toLowerCase()}
              </div>
            </div>
            {showMotivation && (
              <p className="mt-2 text-xs text-chronos-gold/80">
                🌟 {currentStreak} days strong — keep the fire burning!
              </p>
            )}
          </div>
        )}

        {/* ── b) 2×2 Global cards ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t('stats.answered'), value: stats.global.totalAnswered, gold: false },
            { label: t('stats.accuracy'), value: `${accuracy}%`, gold: true },
            { label: t('stats.sessions'), value: stats.global.sessionsCompleted, gold: false },
            { label: t('stats.perfectSessions'), value: stats.global.perfectSessions, gold: true },
          ].map(({ label, value, gold }) => (
            <div
              key={label}
              className="rounded-xl bg-chronos-card border border-chronos-border p-4 flex flex-col gap-1"
            >
              <span className="text-xs text-chronos-muted uppercase tracking-widest">{label}</span>
              <span className={`text-2xl font-medium ${gold ? 'text-chronos-gold' : 'text-chronos-text'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* ── c) Correct vs Wrong bar ── */}
        {stats.global.totalAnswered > 0 && (
          <div className="rounded-xl bg-chronos-card border border-chronos-border p-4">
            <div className="flex justify-between mb-3">
              <div>
                <p className="text-xs text-chronos-muted uppercase tracking-widest mb-0.5">
                  {t('stats.correct')}
                </p>
                <span className="text-2xl font-medium" style={{ color: '#5DCAA5' }}>
                  {stats.global.totalCorrect}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-chronos-muted uppercase tracking-widest mb-0.5">
                  {t('stats.wrong')}
                </p>
                <span className="text-2xl font-medium" style={{ color: '#E24B4A' }}>
                  {totalWrong}
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-chronos-border">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${correctPct}%`,
                  background: 'linear-gradient(90deg, #5DCAA5, #f59e0b)',
                }}
              />
            </div>
          </div>
        )}

        {/* ── d) By Category ── */}
        {playedCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-chronos-text mb-3">
              <span className="text-chronos-gold">▸</span> {t('stats.byCategory')}
            </h3>
            <div className="flex flex-col gap-3">
              {playedCategories.map(([id, data]) => {
                const pct = data.answered ? Math.round((data.correct / data.answered) * 100) : 0;
                return (
                  <div key={id} className="rounded-xl bg-chronos-card border border-chronos-border p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl flex-shrink-0">
                          {CATEGORY_ICONS[id] ?? '📜'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-chronos-text truncate">
                            {getCategoryLabel(id)}
                          </p>
                          <p className="text-xs text-chronos-muted">
                            {t('stats.answeredCount', { count: data.answered })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-semibold text-chronos-gold">{pct}%</span>
                        <p className="text-xs text-chronos-muted">{data.correct}/{data.answered}</p>
                      </div>
                    </div>
                    <div className="h-1 w-full rounded-full bg-chronos-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-chronos-gold transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── e) By Difficulty ── */}
        {(stats.byDifficulty.easy.answered > 0 ||
          stats.byDifficulty.medium.answered > 0 ||
          stats.byDifficulty.hard.answered > 0) && (
          <div>
            <h3 className="text-sm font-semibold text-chronos-text mb-3">
              <span className="text-chronos-gold">▸</span> {t('stats.byDifficulty')}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'medium', 'hard'] as const).map((d) => {
                const data = stats.byDifficulty[d];
                const pct = getDifficultyAccuracy(d);
                const colors = {
                  easy:   { badge: 'border-emerald-800 text-emerald-400 bg-emerald-950' },
                  medium: { badge: 'border-amber-800 text-amber-400 bg-amber-950' },
                  hard:   { badge: 'border-red-800 text-red-400 bg-red-950' },
                };
                return (
                  <div
                    key={d}
                    className="rounded-xl bg-chronos-card border border-chronos-border p-3 flex flex-col items-center gap-2"
                  >
                    <span
                      className={`text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border ${colors[d].badge}`}
                    >
                      {t(`categories.difficulty.${d}`)}
                    </span>
                    <span className="text-2xl font-medium text-chronos-gold">{pct}%</span>
                    <span className="text-xs text-chronos-muted">{data.correct}/{data.answered}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── f) Insight block ── */}
        <div
          className="rounded-xl bg-chronos-card border border-chronos-border p-4"
          style={{ borderLeft: '3px solid #f5a623' }}
        >
          <p className="text-xs font-semibold text-chronos-gold uppercase tracking-widest mb-2">
            ★ {t('stats.yourStrength')}
          </p>
          {hasInsight ? (
            <p className="text-sm text-chronos-text leading-relaxed">
              {t('stats.strengthMessage', {
                category: getCategoryLabel(strongestId!),
                accuracy: getCategoryAccuracy(strongestId!),
                weak: getCategoryLabel(weakestId!),
              })}
            </p>
          ) : (
            <p className="text-sm text-chronos-muted">{t('stats.notEnoughData')}</p>
          )}
        </div>

        {/* ── g) Reset button ── */}
        <button
          onClick={() => setShowResetModal(true)}
          className="w-full rounded-2xl border border-red-800 text-red-400 bg-transparent px-8 py-4 text-sm font-medium tracking-widest uppercase transition-all duration-200 hover:bg-red-950 active:scale-[0.97] mt-2"
        >
          {t('stats.reset')}
        </button>

        <div className="h-6" />
      </main>

      {/* ── Reset confirmation modal ── */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(9,9,15,0.85)' }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-chronos-border bg-chronos-card p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-chronos-text mb-2">
              {t('stats.resetConfirm.title')}
            </h3>
            <p className="text-sm text-chronos-muted mb-6 leading-relaxed">
              {t('stats.resetConfirm.text')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 rounded-xl border border-chronos-border bg-transparent py-3 text-sm font-medium text-chronos-muted hover:border-chronos-gold/40 hover:text-chronos-text transition-colors active:scale-[0.97]"
              >
                {t('stats.resetConfirm.cancel')}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500 transition-colors active:scale-[0.97]"
              >
                {t('stats.resetConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast feedback ── */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-chronos-border bg-chronos-card px-5 py-3 text-sm text-chronos-text shadow-lg animate-slide-up">
          ✓ Statistics reset
        </div>
      )}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
