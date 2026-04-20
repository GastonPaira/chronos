import { useTranslation } from 'next-i18next';
import ChronosLogo from '@/components/ChronosLogo';
import { signInWithGoogle } from '@/lib/auth';

export function LoginScreen() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-chronos-bg px-6 py-12 relative overflow-hidden">
      {/* Background image */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/home-bg.jpg)' }}
      />
      {/* Dark overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(9,9,15,0.72) 0%, rgba(9,9,15,0.60) 40%, rgba(9,9,15,0.88) 100%)' }}
      />
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(245,158,11,0.06) 0%, transparent 70%)' }}
      />

      <div className="flex flex-col items-center gap-10 animate-fade-in relative z-10 max-w-sm w-full">
        <ChronosLogo size="lg" />

        <p className="text-chronos-muted text-center text-base tracking-wide">
          {t('auth.tagline')}
        </p>

        {/* Decorative divider */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-chronos-border" />
          <span className="text-chronos-gold/40 text-xs">✦</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-chronos-border" />
        </div>

        <button
          onClick={signInWithGoogle}
          className="flex items-center justify-center gap-3 w-full rounded-2xl border border-chronos-border bg-chronos-card/60 px-8 py-5 text-chronos-text text-base font-medium tracking-wide transition-all duration-200 hover:border-chronos-gold/50 hover:bg-chronos-card active:scale-[0.97]"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" className="flex-shrink-0">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5C9.6 39.6 16.4 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          {t('auth.signIn')}
        </button>
      </div>

      <p className="absolute bottom-6 z-10 text-xs text-chronos-border tracking-widest uppercase">
        Historical Trivia · Trivia Histórica
      </p>
    </div>
  );
}
