// "Red de seguridad" en español: el contenido se lee en inglés y el español aparece solo si el jugador lo pide.

import { useTranslation } from 'next-i18next';

interface ToggleProps {
  open: boolean;
  onToggle: () => void;
  className?: string;
}

/** Small "ES" pill that shows or hides the Spanish version of a block. */
export function SpanishToggle({ open, onToggle, className = '' }: ToggleProps) {
  const { t } = useTranslation('common');
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onToggle(); }}
      aria-pressed={open}
      aria-label={open ? t('safetyNet.hide') : t('safetyNet.show')}
      title={open ? t('safetyNet.hide') : t('safetyNet.show')}
      className={`text-[11px] font-semibold tracking-wider px-2 py-0.5 rounded-full border transition-colors ${
        open
          ? 'border-chronos-gold bg-chronos-gold/15 text-chronos-gold'
          : 'border-chronos-border text-chronos-muted hover:border-chronos-gold/50 hover:text-chronos-gold'
      } ${className}`}
    >
      ES
    </button>
  );
}

/** Spanish line shown under the English text. `lang="es"` lets tap-to-hear use a Spanish voice. */
export function SpanishText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <p lang="es" className={`text-zinc-400 italic leading-relaxed animate-fade-in ${className}`}>
      {text}
    </p>
  );
}
