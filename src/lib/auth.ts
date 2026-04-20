import { supabase } from './supabase';

export async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/`
        : '/',
    },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}
