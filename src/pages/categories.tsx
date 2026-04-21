import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import type { Locale, Category, Question } from '@/types';
import questionsData from '@/data/questions';
import LanguageSelector from '@/components/LanguageSelector';
import CategoryCard from '@/components/CategoryCard';
import { AuthButton } from '@/components/AuthButton';

const ERA_CATEGORIES: Record<string, string[]> = {
  'ancient-age':  ['ancient-egypt', 'ancient-greece', 'roman-empire'],
  'middle-ages':  ['byzantine-empire', 'crusades-chivalry', 'vikings'],
  'early-modern': [],
  'modern-era':   [],
};

function buildCategories(questions: Question[]): Category[] {
  const map = new Map<string, Category>();
  for (const q of questions) {
    const existing = map.get(q.category);
    if (existing) {
      existing.count++;
      existing.difficulties.push(q.difficulty);
    } else {
      map.set(q.category, {
        id: q.category,
        label: q.category_label,
        count: 1,
        difficulties: [q.difficulty],
      });
    }
  }
  return Array.from(map.values());
}

export default function Categories() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const locale = (i18n.language as Locale) ?? 'en';
  const eraId = router.isReady ? (router.query.era as string | undefined) : undefined;

  const categories = useMemo(() => {
    const all = buildCategories(questionsData as Question[]);
    if (!eraId || !ERA_CATEGORIES[eraId]) return all;
    const allowed = ERA_CATEGORIES[eraId];
    return all.filter(cat => allowed.includes(cat.id));
  }, [eraId]);

  return (
    <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <header className="flex items-center px-2 h-12 relative bg-[#09090f] border-b border-white/5 mb-8 w-full">
        <button
          onClick={() => router.push(eraId ? '/eras' : '/')}
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

      {/* Step indicator (only when navigating from era selection) */}
      {eraId && (
        <div className="max-w-2xl mx-auto mb-8 flex items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border border-chronos-gold/40 text-chronos-gold/60 text-xs font-bold flex items-center justify-center flex-shrink-0">
              ✓
            </div>
            <span className="text-xs text-chronos-muted uppercase tracking-wider">
              {t('eras.stepEra')}
            </span>
          </div>
          <div className="flex-1 h-px bg-chronos-gold/30" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-chronos-gold text-chronos-bg text-xs font-bold flex items-center justify-center flex-shrink-0">
              2
            </div>
            <span className="text-xs text-chronos-gold font-medium uppercase tracking-wider">
              {t('eras.stepCategory')}
            </span>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-chronos-text">
          {t('categories.title')}
        </h2>
        <div className="mt-2 h-0.5 w-12 bg-chronos-gold rounded-full" />
      </div>

      {/* Category grid */}
      <main className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              locale={locale}
              onClick={() => router.push(eraId ? `/game/${cat.id}?era=${eraId}` : `/game/${cat.id}`)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
