import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/');
        return;
      }

      // Handle hash-based token (implicit flow)
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          router.replace('/');
        }
      });
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-chronos-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-chronos-gold border-t-transparent rounded-full animate-spin" />
        <div className="text-chronos-muted text-sm">Signing in...</div>
      </div>
    </div>
  );
}
