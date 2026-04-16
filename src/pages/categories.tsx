import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import type { Locale, Category, Question } from '@/types';
import questionsData from '@/data/questions.json';
import LanguageSelector from '@/components/LanguageSelector';
import CategoryCard from '@/components/CategoryCard';
import ChronosLogo from '@/components/ChronosLogo';

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

  const categories = useMemo(
    () => buildCategories(questionsData as Question[]),
    []
  );

  return (
    <div className="min-h-screen bg-chronos-bg px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <header className="flex items-center justify-between max-w-2xl mx-auto mb-10">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm text-chronos-muted hover:text-chronos-text transition-colors"
        >
          ← {t('nav.back')}
        </button>
        <ChronosLogo size="sm" />
        <LanguageSelector />
      </header>

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
              onClick={() => router.push(`/game/${cat.id}`)}
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
