import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import { useEffect } from 'react';
import '@/styles/globals.css';

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('SW registration failed:', err));
    }
  }, []);

  return <Component {...pageProps} />;
}

export default appWithTranslation(App);
