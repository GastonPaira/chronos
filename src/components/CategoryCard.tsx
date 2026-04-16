import { useTranslation } from 'next-i18next';
import type { Category, Locale } from '@/types';

interface Props {
  category: Category;
  locale: Locale;
  onClick: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'ancient-egypt':  '𓂀',
  'ancient-greece': '🏛️',
  'roman-empire':   '⚔️',
  'renaissance':    '🎨',
  'world-wars':     '🌍',
  'space-race':     '🚀',
};

const DOMINANT_DIFFICULTY = (difficulties: string[]): string => {
  const counts: Record<string, number> = {};
  for (const d of difficulties) counts[d] = (counts[d] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'medium';
};

export default function CategoryCard({ category, locale, onClick }: Props) {
  const { t } = useTranslation('common');
  const icon = CATEGORY_ICONS[category.id] ?? '📜';
  const dominant = DOMINANT_DIFFICULTY(category.difficulties);

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-chronos-border bg-chronos-card p-5 text-left transition-all duration-200 hover:border-chronos-gold/40 hover:bg-chronos-surface active:scale-[0.97] w-full"
    >
      {/* Icon */}
      <span className="text-3xl">{icon}</span>

      {/* Label */}
      <div className="flex-1">
        <h3 className="font-semibold text-chronos-text group-hover:text-chronos-gold transition-colors text-base leading-tight">
          {category.label[locale]}
        </h3>
        <p className="text-xs text-chronos-muted mt-1">
          {category.count} {t('categories.questions')}
        </p>
      </div>

      {/* Difficulty badge */}
      <span
        className={`text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border ${
          dominant === 'easy'
            ? 'border-emerald-800 text-emerald-400 bg-emerald-950'
            : dominant === 'medium'
            ? 'border-amber-800 text-amber-400 bg-amber-950'
            : 'border-red-800 text-red-400 bg-red-950'
        }`}
      >
        {t(`categories.difficulty.${dominant}`)}
      </span>
    </button>
  );
}
