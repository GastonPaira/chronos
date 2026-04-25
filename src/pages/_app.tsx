import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginScreen } from '@/components/LoginScreen';
import MapModal from '@/components/MapModal';
import '@/styles/globals.css';

function AppContent({ Component, pageProps }: AppProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showMap, setShowMap] = useState(false);

  if (router.pathname === '/auth/callback') {
    return <Component {...pageProps} />;
  }

  if (loading) {
    return <div className="min-h-screen bg-chronos-bg" />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <>
      <Component {...pageProps} />
      <button
        onClick={() => setShowMap(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-chronos-gold flex items-center justify-center shadow-lg text-chronos-bg text-xl hover:bg-amber-400 transition-colors active:scale-95"
        aria-label="Open world map"
      >
        🌍
      </button>
      <MapModal isOpen={showMap} onClose={() => setShowMap(false)} />
    </>
  );
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
