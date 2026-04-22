import { supabase } from './supabase';

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

export async function signOut() {
  await supabase.auth.signOut();
}
