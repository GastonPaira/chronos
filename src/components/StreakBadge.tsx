import { useState, useEffect } from 'react';
import { useStreak } from '@/hooks/useStreak';

export default function StreakBadge() {
  const [mounted, setMounted] = useState(false);
  const { currentStreak } = useStreak();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (currentStreak <= 0) return null;

  return (
    <span className="flex items-center gap-1 text-sm font-semibold text-chronos-gold">
      🔥 {currentStreak}
    </span>
  );
}
