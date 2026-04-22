// Hook para el prompt de instalación PWA: detecta si la app puede o ya fue instalada.

import { useState, useEffect, useRef } from 'react';

/**
 * Typed wrapper around the non-standard `BeforeInstallPromptEvent` browser API.
 * This event is fired by Chrome/Edge on Android before the browser would show
 * its own install prompt; we intercept it to show a custom UI.
 */
interface BeforeInstallPromptEvent extends Event {
  /** Triggers the native browser install prompt. */
  prompt: () => Promise<void>;
  /** Resolves with the user's choice after `prompt()` is called. */
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Return type of `useInstallPrompt`.
 *
 * @property canInstall - `true` when the deferred install prompt is available and the app is not yet installed.
 * @property isInstalled - `true` when the app is running in standalone (installed PWA) mode.
 * @property isInWhatsAppWebView - `true` when the user is inside WhatsApp's in-app browser, which cannot install PWAs directly.
 * @property isAndroid - `true` when the user agent indicates an Android device.
 * @property promptInstall - Triggers the native install prompt; returns the user's choice or `'unavailable'` if no prompt is queued.
 */
export interface UseInstallPromptResult {
  canInstall: boolean;
  isInstalled: boolean;
  isInWhatsAppWebView: boolean;
  isAndroid: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

/**
 * Tracks the PWA installation state and provides a programmatic install trigger.
 *
 * Listens for the `beforeinstallprompt` event (Android Chrome/Edge) and saves
 * a reference to the deferred prompt. Also detects whether the app is already
 * running in standalone mode or inside environments that block installation
 * (WhatsApp WebView).
 *
 * All derived values are `false` during SSR and before the component mounts
 * to avoid hydration mismatches.
 *
 * Side effects:
 * - Adds and removes `beforeinstallprompt` and `appinstalled` event listeners.
 *
 * @returns A `UseInstallPromptResult` object.
 */
export function useInstallPrompt(): UseInstallPromptResult {
  const [mounted, setMounted] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setMounted(true);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Shows the native browser install prompt if one has been deferred.
   *
   * @returns
   *   - `'accepted'` if the user confirmed installation.
   *   - `'dismissed'` if the user cancelled.
   *   - `'unavailable'` if no deferred prompt is queued (e.g. iOS, already installed).
   */
  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt.current) return 'unavailable';
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    setCanInstall(false);
    return outcome;
  };

  return {
    canInstall: mounted && canInstall,
    isInstalled: mounted && isInstalled,
    isInWhatsAppWebView: mounted ? /WhatsApp|FBAN|FBAV/i.test(navigator.userAgent) : false,
    isAndroid: mounted ? /android/i.test(navigator.userAgent) : false,
    promptInstall,
  };
}
