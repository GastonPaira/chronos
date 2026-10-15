// Botón para silenciar o activar los sonidos del juego.

import { useTranslation } from 'next-i18next';
import { useFlag } from '@/hooks/useFlag';
import { playCorrect } from '@/lib/sounds';

export default function SoundToggle({ className = '' }: { className?: string }) {
  const { t } = useTranslation('common');
  const [on, setOn] = useFlag('chronos_sound');

  const toggle = () => {
    setOn(!on);
    if (!on) playCorrect();
  };

  const label = on ? t('sound.mute') : t('sound.unmute');
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={on}
      className={`w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm hover:bg-white/10 transition-colors ${className}`}
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}
