// Pantalla de resultados del juego individual: muestra puntaje, estrellas y opciones de replay.

import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import ChronosLogo from './ChronosLogo';

/**
 * Props for `ResultScreen`.
 *
 * @property score - Number of correct answers in the completed session.
 * @property total - Total number of questions in the session.
 * @property category - Category slug used to restart the game via routing when `onPlayAgain` is not provided.
 * @property onPlayAgain - Optional callback for the "Play Again" button.
 *   When omitted, the button navigates to `/game/[category]` instead.
 */
interface Props {
  score: number;
  total: number;
  category: string;
  onPlayAgain?: () => void;
}

/**
 * Returns a localized result message based on the score ratio.
 *
 * @param score - Correct answers.
 * @param total - Total questions.
 * @param t - Translation function from `next-i18next`.
 * @returns A motivational message string for the given performance tier.
 */
function getMessage(score: number, total: number, t: (key: string) => string): string {
  const ratio = score / total;
  if (score === total) return t('results.messages.perfect');
  if (ratio >= 0.7) return t('results.messages.high');
  if (ratio >= 0.4) return t('results.messages.medium');
  return t('results.messages.low');
}

/**
 * Returns a Tailwind text-color class for the score number based on performance.
 *
 * @param score - Correct answers.
 * @param total - Total questions.
 * @returns A Tailwind CSS color class string.
 */
function getScoreColor(score: number, total: number): string {
  const ratio = score / total;
  if (score === total) return 'text-chronos-gold';
  if (ratio >= 0.7) return 'text-emerald-400';
  if (ratio >= 0.4) return 'text-blue-400';
  return 'text-chronos-muted';
}

/**
 * Calculates the number of stars (0–3) to display for a given score.
 *
 * @param score - Correct answers.
 * @param total - Total questions.
 * @returns Star count: 3 for perfect, 2 for ≥70%, 1 for ≥40%, 0 otherwise.
 */
const STARS = (score: number, total: number) => {
  const ratio = score / total;
  if (ratio === 1) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.4) return 1;
  return 0;
};

/**
 * Displays the end-of-game results screen.
 *
 * Shows the Chronos logo, a 0–3 star rating, the numeric score, an optional
 * "perfect game" badge, a performance message, and two action buttons:
 * "Play Again" and "Choose Category".
 */
export default function ResultScreen({ score, total, category, onPlayAgain }: Props) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const stars = STARS(score, total);

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in text-center">
      <ChronosLogo size="sm" />

      {/* Stars */}
      <div className="flex gap-2 text-4xl">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`transition-all duration-300 ${
              i < stars ? 'opacity-100 scale-110' : 'opacity-20 grayscale'
            }`}
            style={{ animationDelay: `${i * 150}ms` }}
          >
            ⭐
          </span>
        ))}
      </div>

      {/* Score */}
      <div>
        <p className="text-xs uppercase tracking-widest text-chronos-muted mb-2">
          {t('results.title')}
        </p>
        <div className={`text-7xl font-bold tabular-nums ${getScoreColor(score, total)}`}>
          {score}
          <span className="text-3xl text-chronos-muted font-normal">/{total}</span>
        </div>
      </div>

      {/* Perfect badge */}
      {score === total && (
        <div className="px-4 py-2 rounded-full border border-chronos-gold/40 bg-chronos-gold/10 text-chronos-gold text-sm font-medium animate-pulse-gold">
          {t('results.perfect')}
        </div>
      )}

      {/* Message */}
      <p className="text-chronos-muted text-base max-w-xs leading-relaxed">
        {getMessage(score, total, t)}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={() => onPlayAgain ? onPlayAgain() : router.push(`/game/${category}`)}
          className="flex-1 rounded-xl bg-chronos-gold px-5 py-3.5 text-chronos-bg font-semibold hover:bg-chronos-gold-light transition-all duration-200 active:scale-[0.98]"
        >
          {t('results.playAgain')}
        </button>
        <button
          onClick={() => router.push('/categories')}
          className="flex-1 rounded-xl border border-chronos-border bg-chronos-card px-5 py-3.5 text-chronos-text font-medium hover:border-chronos-gold/40 transition-all duration-200 active:scale-[0.98]"
        >
          {t('results.chooseCategory')}
        </button>
      </div>
    </div>
  );
}
