// Banner de instalación PWA: guía al usuario para instalar la app según el entorno del dispositivo.

import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import InstallInstructionsModal from './InstallInstructionsModal';

/**
 * Renders a contextual PWA install prompt adapted to the user's environment.
 *
 * Render conditions (renders `null` otherwise):
 * - Only shown on Android devices or inside WhatsApp WebView.
 * - Hidden when the app is already installed (standalone mode).
 *
 * Three possible states:
 * 1. **WhatsApp WebView** – shows a banner with a deep-link button that opens the URL
 *    in Chrome via an Android intent URI, because WebView cannot install PWAs directly.
 * 2. **Native install available** – shows a banner with a button that triggers
 *    the deferred `beforeinstallprompt` browser dialog.
 * 3. **No prompt available** – shows a small text link that opens
 *    `InstallInstructionsModal` with manual installation steps.
 */
export default function InstallBanner() {
  const { t } = useTranslation('common');
  const { canInstall, isInstalled, isInWhatsAppWebView, isAndroid, promptInstall } =
    useInstallPrompt();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) return null;
  if (!isAndroid && !isInWhatsAppWebView) return null;

  if (isInWhatsAppWebView) {
    const intentUrl =
      typeof window !== 'undefined'
        ? `intent://${window.location.href.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
        : '#';

    return (
      <div className="w-full rounded-2xl border border-chronos-border bg-chronos-surface px-5 py-4 flex items-start justify-between gap-4 animate-fade-in">
        <p className="text-chronos-muted text-sm leading-snug">
          📱 {t('install.whatsapp.message')}
        </p>
        <a
          href={intentUrl}
          className="shrink-0 rounded-xl bg-chronos-gold px-4 py-2 text-chronos-bg font-semibold text-sm tracking-wide transition-all hover:bg-chronos-gold-light active:scale-[0.97]"
        >
          {t('install.whatsapp.cta')}
        </a>
      </div>
    );
  }

  if (canInstall) {
    return (
      <div className="w-full rounded-2xl border border-chronos-gold/30 bg-amber-950/20 px-5 py-4 flex items-center justify-between gap-4 animate-fade-in">
        <p className="text-chronos-text text-sm leading-snug font-medium">
          📲 {t('install.banner.title')}
        </p>
        <button
          onClick={() => promptInstall()}
          className="shrink-0 rounded-xl bg-chronos-gold px-4 py-2 text-chronos-bg font-semibold text-sm tracking-wide transition-all hover:bg-chronos-gold-light active:scale-[0.97]"
        >
          {t('install.banner.cta')}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-chronos-muted text-xs underline underline-offset-2 hover:text-chronos-gold transition-colors"
      >
        {t('install.help.link')}
      </button>
      {showModal && <InstallInstructionsModal onClose={() => setShowModal(false)} />}
    </>
  );
}
