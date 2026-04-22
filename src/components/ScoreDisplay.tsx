// Encabezado de progreso del juego: muestra número de pregunta, barra de progreso y puntaje.

import { useTranslation } from 'next-i18next';

/**
 * Props for `ScoreDisplay`.
 *
 * @property score - Current number of correct answers in this session.
 * @property current - Zero-based index of the question currently on screen.
 * @property total - Total number of questions in the round.
 */
interface Props {
  score: number;
  current: number;
  total: number;
}

/**
 * Displays a compact header row with three elements:
 * - **Question counter** – "Question N / total" (always visible).
 * - **Progress bar** – filled proportionally to `(current + 1) / total` (hidden on mobile).
 * - **Score** – current correct-answer count highlighted in gold.
 *
 * Used at the top of the single-player game page during both `'playing'` and `'reflecting'` phases.
 */
export default function ScoreDisplay({ score, current, total }: Props) {
  const { t } = useTranslation('common');

  return (
    <div className="flex items-center justify-between w-full">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-chronos-muted uppercase tracking-widest">
          {t('game.question')}
        </span>
        <span className="text-sm font-semibold text-chronos-text">
          {current + 1}
          <span className="text-chronos-muted font-normal"> / {total}</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="hidden sm:flex flex-1 mx-4 h-1 bg-chronos-border rounded-full overflow-hidden">
        <div
          className="h-full bg-chronos-gold rounded-full transition-all duration-500"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* Score */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-chronos-muted uppercase tracking-widest">
          {t('game.score')}
        </span>
        <span className="text-sm font-bold text-chronos-gold">{score}</span>
      </div>
    </div>
  );
}
