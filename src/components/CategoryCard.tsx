// Tarjeta de categoría: botón visual con imagen de fondo, ícono, nombre y dificultad dominante.

import { useTranslation } from 'next-i18next';
import type { Category, Locale } from '@/types';
import { getCategoryIcon, getCategoryImage } from '@/data/catalog';
import { getDominantDifficulty } from '@/lib/questions';

/**
 * Props for `CategoryCard`.
 *
 * @property category - The category data to display.
 * @property locale - Active locale used to render the translated category label.
 * @property onClick - Called when the user taps the card.
 */
interface Props {
  category: Category;
  locale: Locale;
  onClick: () => void;
}

/**
 * Renders a tappable category card with:
 * - A background image (when available) that zooms slightly on hover.
 * - A dark gradient overlay for text legibility.
 * - The category icon, localized label, question count, and dominant difficulty badge.
 *
 * Used in the category selection grid on `/categories`.
 */
export default function CategoryCard({ category, locale, onClick }: Props) {
  const { t } = useTranslation('common');
  const icon = getCategoryIcon(category.id);
  const dominant = getDominantDifficulty(category.difficulties);
  const imageUrl = getCategoryImage(category.id);

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start gap-3 rounded-2xl border border-chronos-border overflow-hidden text-left transition-all duration-200 hover:border-chronos-gold/50 active:scale-[0.97] w-full min-h-[160px]"
    >
      {/* Background image */}
      {imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(9,9,15,0.95) 0%, rgba(9,9,15,0.65) 55%, rgba(9,9,15,0.40) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-start gap-3 p-5 w-full h-full flex-1">
        {/* Icon */}
        <span className="text-3xl drop-shadow">{icon}</span>

        {/* Label */}
        <div className="flex-1">
          <h3 className="font-semibold text-chronos-text group-hover:text-chronos-gold transition-colors text-base leading-tight drop-shadow">
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
              ? 'border-emerald-800 text-emerald-400 bg-emerald-950/80'
              : dominant === 'medium'
              ? 'border-amber-800 text-amber-400 bg-amber-950/80'
              : 'border-red-800 text-red-400 bg-red-950/80'
          }`}
        >
          {t(`categories.difficulty.${dominant}`)}
        </span>
      </div>
    </button>
  );
}
