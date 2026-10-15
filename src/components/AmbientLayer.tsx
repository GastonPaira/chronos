// Capa invisible que reproduce el ambiente sonoro de la era mientras la pantalla está abierta.

import { useEffect } from 'react';
import { useFlag } from '@/hooks/useFlag';
import { pauseWhenHidden, startAmbience, stopAmbience } from '@/lib/ambience';

interface Props {
  /** Era whose ambience should play; nothing plays without one. */
  eraId: string | undefined;
}

export default function AmbientLayer({ eraId }: Props) {
  const [soundOn] = useFlag('chronos_sound');
  const [ambienceOn] = useFlag('chronos_ambience');

  useEffect(() => {
    if (!eraId || !soundOn || !ambienceOn) return;
    startAmbience(eraId);
    const unwatch = pauseWhenHidden();
    return () => {
      unwatch();
      stopAmbience();
    };
  }, [eraId, soundOn, ambienceOn]);

  return null;
}
