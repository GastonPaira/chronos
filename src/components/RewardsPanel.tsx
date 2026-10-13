// Premios al terminar una lección: XP ganado, nivel, meta diaria y logros nuevos.

import { useTranslation } from 'next-i18next';
import type { LessonRewards } from '@/hooks/useProgress';
import { useAchievementInfo } from '@/hooks/useAchievementInfo';
import { GOAL_LESSONS, GOAL_WORDS, XP_GOAL, type DailyProgress, type LevelInfo } from '@/lib/progress';
import LevelBar from '@/components/LevelBar';

interface Props {
  rewards: LessonRewards;
  level: LevelInfo;
  daily: DailyProgress;
}

export default function RewardsPanel({ rewards, level, daily }: Props) {
  const { t } = useTranslation('common');
  const achievementInfo = useAchievementInfo();
  const lessons = Math.min(daily.lessons, GOAL_LESSONS);
  const words = Math.min(daily.words, GOAL_WORDS);

  return (
    <div className="w-full max-w-xs flex flex-col gap-3 text-left animate-fade-in">
      {/* XP earned */}
      <div className="rounded-xl border border-chronos-gold/40 bg-chronos-gold/10 px-4 py-3 flex flex-col gap-3">
        <p className="text-center text-2xl font-bold text-chronos-gold tabular-nums animate-pop">
          {t('rewards.xp', { count: rewards.xp })}
        </p>
        <LevelBar level={level} compact />
      </div>

      {rewards.levelUp && (
        <div className="rounded-xl border border-chronos-gold bg-chronos-gold/15 px-4 py-3 text-center animate-pop" style={{ animationDelay: '0.2s' }}>
          <p className="text-sm font-semibold text-chronos-gold-light">🎉 {t('rewards.levelUp', { level: rewards.levelUp })}</p>
        </div>
      )}

      {/* Daily goal */}
      <div className="rounded-xl border border-chronos-border bg-chronos-card px-4 py-3">
        <p className="text-xs uppercase tracking-widest text-chronos-muted mb-2">{t('daily.title')}</p>
        <div className="flex items-center justify-between text-sm">
          <span className={lessons >= GOAL_LESSONS ? 'text-emerald-400' : 'text-chronos-muted'}>
            {lessons >= GOAL_LESSONS ? '✓' : '○'} {t('daily.lesson')}
          </span>
          <span className={words >= GOAL_WORDS ? 'text-emerald-400' : 'text-chronos-muted'}>
            {words >= GOAL_WORDS ? '✓' : '○'} {t('daily.words', { count: GOAL_WORDS })} ({words}/{GOAL_WORDS})
          </span>
        </div>
        {rewards.goalCompleted && (
          <p className="mt-2 text-sm font-semibold text-emerald-400 animate-pop">🏅 {t('rewards.goal', { xp: XP_GOAL })}</p>
        )}
        {!rewards.goalCompleted && !daily.goalDone && words < GOAL_WORDS && (
          <p className="mt-2 text-xs text-chronos-muted">{t('daily.wordsHint')}</p>
        )}
      </div>

      {/* New achievements */}
      {rewards.achievements.length > 0 && (
        <div className="rounded-xl border border-chronos-border bg-chronos-card px-4 py-3 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-chronos-muted">{t('rewards.newAchievements')}</p>
          {rewards.achievements.map((id, index) => {
            const info = achievementInfo(id);
            return (
              <div key={id} className="flex items-center gap-3 animate-pop" style={{ animationDelay: `${0.3 + index * 0.15}s` }}>
                <span className="text-2xl">{info.icon}</span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-chronos-text">{info.title}</span>
                  <span className="text-xs text-chronos-muted">{info.desc}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
