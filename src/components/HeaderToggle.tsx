// Botón cuadrado de la cabecera para activar o desactivar una preferencia (ambiente, modo escucha).

import { useFlag } from '@/hooks/useFlag';
import type { FlagKey } from '@/lib/prefs';

interface Props {
  flag: FlagKey;
  icon: string;
  /** Text read by screen readers and shown as tooltip, depending on the current state. */
  labelOn: string;
  labelOff: string;
}

export default function HeaderToggle({ flag, icon, labelOn, labelOff }: Props) {
  const [on, setOn] = useFlag(flag);
  const label = on ? labelOn : labelOff;
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      aria-label={label}
      title={label}
      aria-pressed={on}
      className={`relative w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-colors ${
        on
          ? 'border-chronos-gold/50 bg-chronos-gold/15 hover:bg-chronos-gold/25'
          : 'border-white/10 bg-white/5 opacity-60 hover:opacity-100 hover:bg-white/10'
      }`}
    >
      {icon}
      {!on && <span aria-hidden className="absolute h-px w-5 rotate-45 bg-chronos-muted" />}
    </button>
  );
}
