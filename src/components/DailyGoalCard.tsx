// Tarjeta de la meta diaria en el inicio: lección + palabras del día, racha y nivel.

import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useProgress } from '@/hooks/useProgress';
import { useStreak } from '@/hooks/useStreak';
import { GOAL_LESSONS, GOAL_WORDS } from '@/lib/progress';
import LevelBar from '@/components/LevelBar';

interface TaskProps {
  done: boolean;
  label: string;
  detail?: string;
  action: string;
  onAction: () => void;
}

function Task({ done, label, detail, action, onAction }: TaskProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
          done ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-chronos-border text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="flex-1 text-sm text-chronos-text">
        {label}
        {detail && <span className="ml-2 text-xs text-chronos-muted tabular-nums">{detail}</span>}
      </span>
      {!done && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-lg border border-chronos-gold/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-chronos-gold hover:bg-chronos-gold/10 transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  );
}

export default function DailyGoalCard() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { progress, level } = useProgress();
  const { currentStreak } = useStreak();

  // Progress lives on the device: nothing to show until it is loaded on the client.
  if (!progress) return null;
  const { daily } = progress;
  const goalDone = daily.goalDone;

  return (
    <div className="w-full rounded-2xl border border-chronos-gold/30 bg-black/40 backdrop-blur-sm p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-chronos-gold">{t('daily.title')}</p>
        {currentStreak > 0 && (
          <p className="flex items-center gap-1 text-sm font-semibold text-chronos-gold-light tabular-nums">
            <span className="animate-flame inline-block">🔥</span>
            {currentStreak}
          </p>
        )}
      </div>

      {goalDone ? (
        <p className="text-sm font-semibold text-emerald-400 animate-pop">🏅 {t('daily.complete')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <Task
            done={daily.lessons >= GOAL_LESSONS}
            label={t('daily.lesson')}
            action={t('daily.start')}
            onAction={() => router.push('/eras')}
          />
          <Task
            done={daily.words >= GOAL_WORDS}
            label={t('daily.words', { count: GOAL_WORDS })}
            detail={`${Math.min(daily.words, GOAL_WORDS)}/${GOAL_WORDS}`}
            action={t('daily.review')}
            onAction={() => router.push('/words')}
          />
        </div>
      )}

      <LevelBar level={level} compact />
    </div>
  );
}
