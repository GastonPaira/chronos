// Componente de racha: muestra el estado de la racha del jugador en la home o al terminar el juego.

import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useStreak, type PlayResult } from '@/hooks/useStreak';

/**
 * Props for `StreakDisplay`.
 *
 * @property context
 *   - `'home'` – renders a compact status line on the home page based on the current streak status.
 *     Returns `null` if the player has never played.
 *   - `'game_end'` – renders a highlighted badge after a game session with the play outcome.
 *     Returns `null` if `playResult` is not provided.
 * @property playResult - The result returned by `registerPlay()` at the end of a session.
 *   Required when `context === 'game_end'`; ignored when `context === 'home'`.
 */
interface Props {
  context: 'home' | 'game_end';
  playResult?: PlayResult;
}

/**
 * Renders a streak status message in one of two contexts.
 *
 * **Home context** – shows a fire emoji followed by a message reflecting whether
 * the streak is active today, alive from yesterday, or already lost. Hidden if
 * the player has never played.
 *
 * **Game-end context** – shows a styled badge describing the outcome of the just-
 * completed session (first time, new record, incremented, reset, or already played today).
 *
 * Renders `null` during SSR to avoid hydration mismatches (streak data is client-only).
 */
export default function StreakDisplay({ context, playResult }: Props) {
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation('common');
  const { currentStreak, getStreakStatus } = useStreak();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (context === 'home') {
    const status = getStreakStatus();
    if (status === 'never_played') return null;

    let message: string;
    if (status === 'active_today') {
      message = t('streak.home.activeToday', { count: currentStreak });
    } else if (status === 'active_yesterday') {
      message = t('streak.home.activeYesterday', { count: currentStreak });
    } else {
      message = t('streak.home.lost');
    }

    return (
      <div className="flex items-center justify-center gap-2 text-sm text-chronos-muted">
        <span>🔥</span>
        <span>{message}</span>
      </div>
    );
  }

  // game_end context
  if (!playResult) return null;

  let message: string;
  if (playResult.result === 'first_time') {
    message = t('streak.gameEnd.firstTime');
  } else if (playResult.isNewRecord) {
    message = t('streak.gameEnd.newRecord', { count: currentStreak });
  } else if (playResult.result === 'already_today') {
    message = t('streak.gameEnd.alreadyToday', { count: currentStreak });
  } else if (playResult.result === 'reset') {
    message = t('streak.gameEnd.firstStreak');
  } else {
    message = t('streak.gameEnd.incremented', { count: currentStreak });
  }

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-chronos-border bg-chronos-surface text-sm w-full max-w-xs mx-auto">
      <span>🔥</span>
      <span className="text-chronos-text font-medium">{message}</span>
    </div>
  );
}
