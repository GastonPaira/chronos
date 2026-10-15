import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import type { Question } from '@/types';
import questionsData from '@/data/questions';
import LanguageSelector from '@/components/LanguageSelector';
import { AuthButton } from '@/components/AuthButton';
import { ERAS, type EraDef } from '@/data/catalog';
import { getDominantDifficulty } from '@/lib/questions';
import { currentStop, planTrip, totalYears, yearsExplored } from '@/lib/journey';
import { useProgress } from '@/hooks/useProgress';

interface EraData extends EraDef {
  questionCount: number;
  /** Questions of this era the player has answered; `null` until progress is loaded. */
  seenCount: number | null;
  dominantDifficulty: string;
  /** 0 to 1: share of the era already answered. */
  fraction: number;
  complete: boolean;
}

interface EraCardProps {
  era: EraData;
  onClick: () => void;
  /** The player is traveling through this era right now. */
  current?: boolean;
}

function EraCard({ era, onClick, current = false }: EraCardProps) {
  const { t } = useTranslation('common');
  const imageUrl = era.image;
  const isEmpty = era.questionCount === 0;

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-start gap-3 rounded-2xl border overflow-hidden text-left transition-all duration-200 w-full active:scale-[0.97] ${current ? 'border-chronos-gold/60 shadow-lg shadow-chronos-gold/10' : 'border-chronos-border'} hover:border-chronos-gold/50 min-h-[200px]`}
    >
      {/* Background image */}
      {imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      {/* Overlay — dark gradient from bottom, light at top */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(9,9,15,0.95) 0%, rgba(9,9,15,0.70) 50%, rgba(9,9,15,0.45) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-start gap-3 p-5 w-full h-full flex-1">
        {/* Icon */}
        <span className="text-3xl drop-shadow">{era.icon}</span>

        {/* Name + years + description */}
        <div className="flex-1 w-full">
          <h3 className="font-semibold text-base leading-tight transition-colors text-chronos-text group-hover:text-chronos-gold drop-shadow">
            {t(`eras.${era.id}.name`)}
          </h3>
          <p className="text-xs text-chronos-gold/70 mt-0.5 font-medium drop-shadow">
            {t(`eras.${era.id}.years`)}
          </p>
          <p className="text-xs text-chronos-muted mt-1.5 leading-relaxed">
            {t(`eras.${era.id}.description`)}
          </p>
        </div>

        {/* Progress through the era */}
        {!isEmpty && era.seenCount !== null && (
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${era.complete ? 'bg-emerald-400' : 'bg-chronos-gold'}`}
              style={{ width: `${Math.round(era.fraction * 100)}%` }}
            />
          </div>
        )}

        {/* Footer: question count + badge */}
        <div className="flex items-center justify-between w-full mt-1">
          <p className="text-xs text-chronos-muted">
            {isEmpty ? (
              <span className="text-chronos-muted/60 italic">
                {t('eras.noQuestions')}
              </span>
            ) : era.seenCount !== null ? (
              <>{t('eras.progress', { seen: era.seenCount, total: era.questionCount })}</>
            ) : (
              <>{era.questionCount} {t('eras.questions')}</>
            )}
          </p>
          {!isEmpty && era.dominantDifficulty ? (
            <span
              className={`text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                era.dominantDifficulty === 'easy'
                  ? 'border-emerald-800 text-emerald-400 bg-emerald-950/80'
                  : era.dominantDifficulty === 'medium'
                  ? 'border-amber-800 text-amber-400 bg-amber-950/80'
                  : 'border-red-800 text-red-400 bg-red-950/80'
              }`}
            >
              {t(`categories.difficulty.${era.dominantDifficulty}`)}
            </span>
          ) : isEmpty ? (
            <span className="text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border border-chronos-border text-chronos-muted/60">
              {t('eras.soon')}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default function EraSelection() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const { progress } = useProgress();

  const questions = questionsData as Question[];
  const totals = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of questions) counts[q.category] = (counts[q.category] ?? 0) + 1;
    return counts;
  }, [questions]);

  const trip = useMemo(() => planTrip(ERAS, progress, totals, new Date().getFullYear()), [progress, totals]);
  const eras = useMemo<EraData[]>(
    () =>
      trip.map(stop => ({
        ...stop.era,
        questionCount: stop.total,
        seenCount: progress ? stop.seen : null,
        dominantDifficulty: getDominantDifficulty(
          questions.filter(q => stop.era.categoryIds.includes(q.category)).map(q => q.difficulty),
        ),
        fraction: stop.fraction,
        complete: stop.complete,
      })),
    [trip, progress, questions],
  );

  const explored = yearsExplored(trip);
  const overall = totalYears(trip) > 0 ? explored / totalYears(trip) : 0;
  const here = progress ? currentStop(trip) : -1;
  const started = explored > 0;

  function handleEraClick(eraId: string, isEmpty: boolean) {
    if (isEmpty) {
      setShowComingSoon(true);
      return;
    }
    router.push(`/categories?era=${eraId}`);
  }

  return (
    <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
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
          <LanguageSelector />
          <AuthButton />
        </div>
      </header>

      {/* Step indicator */}
      <div className="max-w-2xl mx-auto mb-8 flex items-center gap-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-chronos-gold text-chronos-bg text-xs font-bold flex items-center justify-center flex-shrink-0">
            1
          </div>
          <span className="text-xs text-chronos-gold font-medium uppercase tracking-wider">
            {t('eras.stepEra')}
          </span>
        </div>
        <div className="flex-1 h-px bg-chronos-border" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-chronos-border text-chronos-muted text-xs font-bold flex items-center justify-center flex-shrink-0">
            2
          </div>
          <span className="text-xs text-chronos-muted uppercase tracking-wider">
            {t('eras.stepCategory')}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-chronos-text">
          {t('eras.title')}
        </h2>
        <div className="mt-2 h-0.5 w-12 bg-chronos-gold rounded-full" />
      </div>

      <main className="max-w-2xl mx-auto">
        {/* The journey so far */}
        <div className="mb-8 rounded-2xl border border-chronos-gold/30 bg-chronos-gold/5 p-4 animate-fade-in">
          <p className="text-xs uppercase tracking-widest text-chronos-gold">{t('journey.title')}</p>
          <p className="mt-1 text-sm text-chronos-text">
            {progress && started
              ? t('journey.explored', { years: explored.toLocaleString(i18n.language) })
              : t('journey.begin')}
          </p>
          <div className="relative mt-4 h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-chronos-gold-dim to-chronos-gold transition-all duration-700"
              style={{ width: `${Math.round(overall * 100)}%` }}
            />
            <span
              aria-hidden
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chronos-gold ring-4 ring-chronos-gold/20 animate-pulse-gold"
              style={{ left: `${Math.max(Math.round(overall * 100), 2)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-chronos-muted">
            <span>{t('journey.startLabel')}</span>
            <span>{t('journey.todayLabel')}</span>
          </div>
        </div>

        {/* Timeline: one stop per era, in order */}
        <ol className="flex flex-col animate-slide-up">
          {eras.map((era, i) => {
            const isHere = i === here;
            const nodeClass = era.complete
              ? 'border-chronos-gold bg-chronos-gold text-chronos-bg'
              : isHere
              ? 'border-chronos-gold bg-chronos-bg text-chronos-gold animate-pulse-gold shadow-lg shadow-chronos-gold/30'
              : 'border-chronos-border bg-chronos-bg text-chronos-muted';
            return (
              <li key={era.id} className="relative pl-14 pb-6 last:pb-0">
                {i < eras.length - 1 && (
                  <>
                    <span aria-hidden className="absolute left-[19px] w-0.5 bg-chronos-border" style={{ top: '3.5rem', bottom: 0 }} />
                    <span
                      aria-hidden
                      className="absolute left-[19px] w-0.5 bg-chronos-gold transition-all duration-700"
                      style={{ top: '3.5rem', height: `calc((100% - 3.5rem) * ${era.fraction})` }}
                    />
                  </>
                )}
                <span
                  aria-hidden
                  className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg ${nodeClass}`}
                  style={{ top: '1rem' }}
                >
                  {era.complete ? '✓' : era.icon}
                </span>
                {isHere && (
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-chronos-gold">
                    📍 {started ? t('journey.here') : t('journey.startHere')}
                  </p>
                )}
                <EraCard
                  era={era}
                  current={isHere}
                  onClick={() => handleEraClick(era.id, era.questionCount === 0)}
                />
              </li>
            );
          })}
        </ol>

        {/* Coming soon notice */}
        {showComingSoon && (
          <div className="mt-4 rounded-xl border border-chronos-border bg-chronos-surface px-4 py-3 animate-fade-in">
            <p className="text-sm text-chronos-muted text-center">
              ⏳ {t('eras.comingSoonDesc')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
