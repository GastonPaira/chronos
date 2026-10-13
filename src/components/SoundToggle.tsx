// Botón para silenciar o activar los sonidos del juego.

import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { isSoundOn, playCorrect, setSoundOn } from '@/lib/sounds';

export default function SoundToggle({ className = '' }: { className?: string }) {
  const { t } = useTranslation('common');
  const [on, setOn] = useState(true);

  useEffect(() => setOn(isSoundOn()), []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setSoundOn(next);
    if (next) playCorrect();
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
