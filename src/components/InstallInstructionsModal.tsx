import { useTranslation } from 'next-i18next';

interface Props {
  onClose: () => void;
}

const STEPS = [
  'install.help.step1',
  'install.help.step2',
  'install.help.step3',
] as const;

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
