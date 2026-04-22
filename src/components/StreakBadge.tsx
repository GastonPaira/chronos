// Insignia de racha: muestra el número de días consecutivos jugados como pequeño badge dorado.

import { useState, useEffect } from 'react';
import { useStreak } from '@/hooks/useStreak';

/**
 * Renders a compact inline badge showing the player's current streak count.
 *
 * Returns `null` in two cases:
 * - During SSR / before mount (streak data is client-only).
 * - When `currentStreak` is 0 or less (no active streak to display).
 *
 * Used in the stats page header alongside the player's summary stats.
 */
export default function StreakBadge() {
  const [mounted, setMounted] = useState(false);
  const { currentStreak } = useStreak();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (currentStreak <= 0) return null;

  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#f5a623] bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-full px-2 py-0.5">
      🔥 {currentStreak}
    </span>
  );
}
