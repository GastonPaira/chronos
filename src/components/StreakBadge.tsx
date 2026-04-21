import { useState, useEffect } from 'react';
import { useStreak } from '@/hooks/useStreak';

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
