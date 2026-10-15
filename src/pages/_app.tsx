import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import { useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import '@/styles/globals.css';

/**
 * Anyone can play without an account. Google sign-in is only required for the
 * versus mode (handled in `/vs/[matchId]` and `/multiplayer`).
 */
function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default appWithTranslation(App);
