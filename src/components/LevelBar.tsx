// Nivel del jugador con su título y la barra de XP hasta el siguiente nivel.

import { useTranslation } from 'next-i18next';
import { MAX_TITLED_LEVEL } from '@/lib/progress';
import type { LevelInfo } from '@/lib/progress';

interface Props {
  level: LevelInfo;
  /** Smaller version for tight spaces. */
  compact?: boolean;
}

export default function LevelBar({ level, compact = false }: Props) {
  const { t } = useTranslation('common');
  const title = t(`level.title.${Math.min(level.level, MAX_TITLED_LEVEL)}`);

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <p className={`font-semibold text-chronos-gold ${compact ? 'text-sm' : 'text-base'}`}>
          {t('level.label', { level: level.level })} · <span className="text-chronos-text font-medium">{title}</span>
        </p>
        <p className="text-xs text-chronos-muted tabular-nums">
          {level.xpIntoLevel}/{level.xpForLevel} XP
        </p>
      </div>
      <div className={`mt-2 w-full rounded-full bg-chronos-border overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-chronos-gold-dim via-chronos-gold to-chronos-gold-light transition-all duration-700"
          style={{ width: `${Math.max(2, Math.round(level.fraction * 100))}%` }}
        />
      </div>
    </div>
  );
}
