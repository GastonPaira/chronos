import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [debug, setDebug] = useState('Starting...');

  useEffect(() => {
    async function handle() {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        setDebug('No tokens found');
        return;
      }

      setDebug('Setting session...');

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setDebug('Error: ' + error.message);
        return;
      }

      if (data.session) {
        setDebug('Success! Redirecting...');
        router.replace('/');
      } else {
        setDebug('No session after setSession');
      }
    }

    handle();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-chronos-bg px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-chronos-gold border-t-transparent rounded-full animate-spin" />
        <div className="text-chronos-muted text-sm text-center break-all">{debug}</div>
      </div>
    </div>
  );
}
