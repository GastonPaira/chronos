import type { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import ChronosLogo from '@/components/ChronosLogo';
import InstallBanner from '@/components/InstallBanner';
import LanguageSelector from '@/components/LanguageSelector';
import StreakDisplay from '@/components/StreakDisplay';
import { AuthButton } from '@/components/AuthButton';
export default function Home() {
  const { t } = useTranslation('common');
  const router = useRouter();

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

      {/* Top bar */}
      <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between">
        <AuthButton />
        <LanguageSelector />
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-10 animate-fade-in relative z-10 max-w-sm w-full">
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

        {/* View Stats button */}
        <button
          onClick={() => router.push('/stats')}
          className="w-full rounded-2xl border border-chronos-border bg-transparent px-8 py-3 text-chronos-muted text-sm font-medium tracking-widest uppercase transition-all duration-200 hover:border-chronos-gold/40 hover:text-chronos-text active:scale-[0.97]"
        >
          {t('stats.viewStats')}
        </button>

        <StreakDisplay context="home" />
      </div>

      {/* Bottom tagline */}
      <p className="absolute bottom-6 z-10 text-xs text-chronos-border tracking-widest uppercase">
        Historical Trivia · Trivia Histórica
      </p>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
