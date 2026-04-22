// Modal de instrucciones de instalación: guía paso a paso para instalar la PWA manualmente.

import { useTranslation } from 'next-i18next';

/**
 * Props for `InstallInstructionsModal`.
 *
 * @property onClose - Called when the user taps the close button or the backdrop.
 */
interface Props {
  onClose: () => void;
}

/** Translation keys for the three numbered installation steps. */
const STEPS = [
  'install.help.step1',
  'install.help.step2',
  'install.help.step3',
] as const;

/**
 * A bottom-sheet modal that explains how to install the Chronos PWA manually.
 *
 * Displays a numbered list of three steps (sourced from i18n translations) and
 * a close button. The backdrop is tappable and also closes the modal.
 * Clicking inside the sheet stops event propagation to prevent accidental closes.
 *
 * Shown by `InstallBanner` when the browser does not support the native install prompt.
 */
export default function InstallInstructionsModal({ onClose }: Props) {
  const { t } = useTranslation('common');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-chronos-card border border-chronos-border px-6 pt-6 pb-10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-chronos-border mx-auto mb-6" />

        <h2 className="text-chronos-gold font-bold text-lg tracking-wide text-center mb-6">
          {t('install.help.title')}
        </h2>

        <ol className="flex flex-col gap-5 mb-8">
          {STEPS.map((key, index) => (
            <li key={key} className="flex items-start gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-chronos-gold/10 border border-chronos-gold/30 text-chronos-gold text-sm font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <span className="text-chronos-text text-sm leading-snug pt-0.5">
                {t(key)}
              </span>
            </li>
          ))}
        </ol>

        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-chronos-gold px-8 py-4 text-chronos-bg font-bold tracking-widest uppercase transition-all hover:bg-chronos-gold-light active:scale-[0.97]"
        >
          {t('install.help.close')}
        </button>
      </div>
    </div>
  );
}
