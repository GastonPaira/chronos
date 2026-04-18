import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import type { Locale, Question } from '@/types';
import questionsData from '@/data/questions.json';
import LanguageSelector from '@/components/LanguageSelector';
import ChronosLogo from '@/components/ChronosLogo';

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

function getDominantDifficulty(difficulties: string[]): string {
  if (!difficulties.length) return '';
  const counts: Record<string, number> = {};
  for (const d of difficulties) counts[d] = (counts[d] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'medium';
}

export default function EraSelection() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const locale = (i18n.language as Locale) ?? 'en';
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
      <header className="flex items-center justify-between max-w-2xl mx-auto mb-8">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm text-chronos-muted hover:text-chronos-text transition-colors"
        >
          ← {t('nav.back')}
        </button>
        <ChronosLogo size="sm" />
        <LanguageSelector />
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
          {eras.map((era) => {
            const isEmpty = era.questionCount === 0;
            return (
              <button
                key={era.id}
                onClick={() => handleEraClick(era.id, isEmpty)}
                className="group flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all duration-200 w-full active:scale-[0.97] border-chronos-border bg-chronos-card hover:border-chronos-gold/40 hover:bg-chronos-surface"
              >
                {/* Icon */}
                <span className="text-3xl">{era.icon}</span>

                {/* Name + years + description */}
                <div className="flex-1 w-full">
                  <h3 className="font-semibold text-base leading-tight transition-colors text-chronos-text group-hover:text-chronos-gold">
                    {t(`eras.${era.id}.name`)}
                  </h3>
                  <p className="text-xs text-chronos-gold/60 mt-0.5 font-medium">
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
                          ? 'border-emerald-800 text-emerald-400 bg-emerald-950'
                          : era.dominantDifficulty === 'medium'
                          ? 'border-amber-800 text-amber-400 bg-amber-950'
                          : 'border-red-800 text-red-400 bg-red-950'
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
              </button>
            );
          })}
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
