// Tarjeta "Seguí donde dejaste" de la home: lleva directo a la categoría en la que el jugador estaba.

import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import type { Locale } from '@/types';
import { getCategoryIcon, getCategoryImage } from '@/data/catalog';
import type { ContinueTarget } from '@/lib/journey';

interface Props {
  target: ContinueTarget;
  /** Category name in the active language. */
  label: string;
}

export default function ContinueCard({ target, label }: Props) {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const image = getCategoryImage(target.categoryId);
  const fraction = target.total > 0 ? target.seen / target.total : 0;
  const locale = (i18n.language as Locale) ?? 'en';

  return (
    <button
      type="button"
      lang={locale}
      onClick={() => router.push(`/game/${target.categoryId}?era=${target.eraId}`)}
      className="group relative w-full overflow-hidden rounded-2xl border border-chronos-gold/50 text-left transition-all duration-200 hover:border-chronos-gold hover:shadow-lg hover:shadow-chronos-gold/20 active:scale-[0.97]"
    >
      {image && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgba(9,9,15,0.92) 0%, rgba(9,9,15,0.75) 60%, rgba(9,9,15,0.55) 100%)' }}
      />
      <div className="relative z-10 flex items-center gap-4 p-4">
        <span className="text-3xl drop-shadow">{getCategoryIcon(target.categoryId)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-chronos-gold">{t('home.continueLabel')}</p>
          <p className="mt-0.5 truncate text-lg font-bold text-chronos-text">{label}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-chronos-gold transition-all duration-700"
                style={{ width: `${Math.round(fraction * 100)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-chronos-muted">
              {t('categories.progress', { seen: target.seen, total: target.total })}
            </span>
          </div>
        </div>
        <span className="text-xl text-chronos-gold transition-transform duration-200 group-hover:translate-x-1">→</span>
      </div>
    </button>
  );
}
