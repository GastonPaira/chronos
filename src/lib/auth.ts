// Funciones de autenticación: inicio de sesión con Google y cierre de sesión.

import { supabase } from './supabase';

/**
 * Redirects the user to Google's OAuth consent screen via Supabase Auth.
 *
 * Before redirecting, the current path is saved to `sessionStorage` under
 * `auth_return_to` so that the OAuth callback page can restore the user's
 * original destination after successful sign-in. The home and callback routes
 * are excluded because they need no return redirect.
 *
 * Side effects: writes to `sessionStorage`, triggers a full-page navigation.
 */
export async function signInWithGoogle() {
  if (typeof window !== 'undefined') {
    const current = window.location.pathname + window.location.search;
    if (current !== '/' && current !== '/auth/callback') {
      sessionStorage.setItem('auth_return_to', current);
    }
  }
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : '/auth/callback',
    },
  });
}

/**
 * Signs the current user out of Supabase Auth.
 *
 * Side effects: clears the active session from the Supabase client and
 * triggers the `onAuthStateChange` listener, which updates `AuthContext`.
 */
export async function signOut() {
  await supabase.auth.signOut();
}
