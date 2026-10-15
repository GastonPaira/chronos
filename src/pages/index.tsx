import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import ChronosLogo from '@/components/ChronosLogo';
import InstallBanner from '@/components/InstallBanner';
import LanguageSelector from '@/components/LanguageSelector';
import StreakDisplay from '@/components/StreakDisplay';
import { AuthButton } from '@/components/AuthButton';
import DailyGoalCard from '@/components/DailyGoalCard';
import Onboarding from '@/components/Onboarding';
import { useProgress } from '@/hooks/useProgress';
import { useWords } from '@/hooks/useWords';
import { toLocalDateKey } from '@/lib/dates';
import { dueCount } from '@/lib/words';

interface TileProps {
  icon: string;
  label: string;
  badge?: number;
  onClick: () => void;
}

function Tile({ icon, label, badge, onClick }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center gap-1 rounded-2xl border border-chronos-border bg-black/30 px-2 py-3 text-xs font-medium uppercase tracking-wider text-chronos-text transition-all hover:border-chronos-gold/50 hover:text-chronos-gold active:scale-[0.97]"
    >
      <span className="text-xl">{icon}</span>
      {label}
      {badge ? (
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-chronos-gold text-chronos-bg text-[11px] font-bold flex items-center justify-center">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function Home() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { progress, markOnboarded } = useProgress();
  const { store } = useWords();
  const wordsDue = store ? dueCount(store, toLocalDateKey()) : 0;

  // First visit: three welcome screens, then straight into the first lesson.
  if (progress && !progress.onboarded) {
    return (
      <Onboarding
        onDone={play => {
          markOnboarded();
          if (play) router.push('/eras');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-chronos-bg px-6 py-12 relative overflow-hidden">
      {/* Background image */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/home-bg.jpg)' }}
      />
      {/* Dark overlay — keeps text legible over any image */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(9,9,15,0.72) 0%, rgba(9,9,15,0.60) 40%, rgba(9,9,15,0.88) 100%)' }}
      />
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(245,158,11,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Top bar — above the main content so the user menu dropdown is clickable */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between">
        <AuthButton />
        <LanguageSelector />
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-6 animate-fade-in relative z-10 max-w-sm w-full">
        <ChronosLogo size="lg" />

        <p className="text-chronos-muted text-center text-base tracking-wide">
          {t('home.tagline')}
        </p>

        {/* Decorative divider */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-chronos-border" />
          <span className="text-chronos-gold/40 text-xs">✦</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-chronos-border" />
        </div>

        <InstallBanner />

        <DailyGoalCard />

        {/* Play button */}
        <button
          onClick={() => router.push('/eras')}
          className="group w-full rounded-2xl bg-chronos-gold px-8 py-5 text-chronos-bg font-bold text-lg tracking-widest uppercase transition-all duration-200 hover:bg-chronos-gold-light hover:shadow-lg hover:shadow-chronos-gold/20 active:scale-[0.97]"
        >
          <span className="flex items-center justify-center gap-3">
            {t('home.playButton')}
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </span>
        </button>

        {/* Secondary destinations */}
        <div className="grid grid-cols-3 gap-3 w-full">
          <Tile icon="⚔️" label={t('home.multiplayerButton')} onClick={() => router.push('/multiplayer')} />
          <Tile icon="📚" label={t('home.words')} badge={wordsDue} onClick={() => router.push('/words')} />
          <Tile icon="🏆" label={t('home.progress')} onClick={() => router.push('/progress')} />
        </div>

        <StreakDisplay context="home" />
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
