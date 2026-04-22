// Botón de autenticación: muestra "Iniciar sesión" o el menú de usuario según el estado de auth.

import { useTranslation } from 'next-i18next';
import { useAuth } from '@/context/AuthContext';
import { signInWithGoogle, signOut } from '@/lib/auth';
import UserMenu from '@/components/UserMenu';

/**
 * Renders either a Google sign-in button or the authenticated user's menu.
 *
 * - While auth state is loading: renders nothing (`null`) to avoid flicker.
 * - When signed in: delegates to `UserMenu`, passing the user's first name,
 *   full name, email, and a sign-out handler.
 * - When signed out: renders a Google-branded sign-in button that calls
 *   `signInWithGoogle()` on click.
 *
 * Used in the navigation header across all pages.
 */
export function AuthButton() {
  const { t } = useTranslation('common');
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    const fullName: string = user.user_metadata?.full_name ?? user.user_metadata?.name ?? '';
    const name = fullName.split(' ')[0] || fullName;
    const email: string = user.email ?? '';
    return <UserMenu name={name} fullName={fullName} email={email} onSignOut={signOut} />;
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-chronos-border
                 text-sm text-chronos-text hover:border-chronos-gold transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5C9.6 39.6 16.4 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
      </svg>
      {t('auth.signIn')}
    </button>
  );
}
