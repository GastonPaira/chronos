import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import type { Question } from '@/types';
import questionsData from '@/data/questions';
import LanguageSelector from '@/components/LanguageSelector';
import { AuthButton } from '@/components/AuthButton';
interface EraDef {
  id: string;
  icon: string;
  categoryIds: string[];
}

const ERA_DEFS: EraDef[] = [
  {
    id: 'ancient-age',
    icon: '𓂀',
    categoryIds: ['ancient-egypt', 'ancient-greece', 'roman-empire'],
  },
  {
    id: 'middle-ages',
    icon: '⚜️',
    categoryIds: ['byzantine-empire', 'crusades-chivalry', 'vikings'],
  },
  {
    id: 'early-modern',
    icon: '🗺️',
    categoryIds: [],
  },
  {
    id: 'modern-era',
    icon: '🌐',
    categoryIds: [],
  },
];

const ERA_IMAGES: Record<string, string> = {
  'ancient-age':  '/images/ancient-age.jpg',
  'middle-ages':  '/images/middle-ages.jpg',
  'early-modern': '/images/early-modern.jpg',
  'modern-era':   '/images/modern-era.jpg',
};

function getDominantDifficulty(difficulties: string[]): string {
  if (!difficulties.length) return '';
  const counts: Record<string, number> = {};
  for (const d of difficulties) counts[d] = (counts[d] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'medium';
}

interface EraData extends EraDef {
  questionCount: number;
  dominantDifficulty: string;
}

interface EraCardProps {
  era: EraData;
  onClick: () => void;
}

function EraCard({ era, onClick }: EraCardProps) {
  const { t } = useTranslation('common');
  const imageUrl = ERA_IMAGES[era.id];
  const isEmpty = era.questionCount === 0;

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start gap-3 rounded-2xl border overflow-hidden text-left transition-all duration-200 w-full active:scale-[0.97] border-chronos-border hover:border-chronos-gold/50 min-h-[200px]"
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

        {/* Footer: question count + badge */}
        <div className="flex items-center justify-between w-full mt-1">
          <p className="text-xs text-chronos-muted">
            {isEmpty ? (
              <span className="text-chronos-muted/60 italic">
                {t('eras.noQuestions')}
              </span>
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
  const { t } = useTranslation('common');
  const router = useRouter();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const eras = useMemo(() => {
    const questions = questionsData as Question[];
    return ERA_DEFS.map((era) => {
      const eraQuestions = questions.filter(q => era.categoryIds.includes(q.category));
      return {
        ...era,
        questionCount: eraQuestions.length,
        dominantDifficulty: getDominantDifficulty(eraQuestions.map(q => q.difficulty)),
      };
    });
  }, []);

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

      {/* Era grid */}
      <main className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
          {eras.map((era) => (
            <EraCard
              key={era.id}
              era={era}
              onClick={() => handleEraClick(era.id, era.questionCount === 0)}
            />
          ))}
        </div>

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
