import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginScreen } from '@/components/LoginScreen';
import '@/styles/globals.css';

function AppContent({ Component, pageProps }: AppProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-chronos-bg" />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <Component {...pageProps} />;
}

function App(props: AppProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return (
    <AuthProvider>
      <AppContent {...props} />
    </AuthProvider>
  );
}

export default appWithTranslation(App);
