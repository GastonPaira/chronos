// Hook de preferencia on/off guardada en el dispositivo (sonido, ambiente, lectura automática, modo escucha).

import { useCallback, useSyncExternalStore } from 'react';
import { defaultFlag, readFlag, subscribePrefs, writeFlag, type FlagKey } from '@/lib/prefs';

/** `[on, setOn]` for a saved preference. Every component using the same key stays in sync. */
export function useFlag(key: FlagKey): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    subscribePrefs,
    () => readFlag(key),
    () => defaultFlag(key),
  );
  const setOn = useCallback((value: boolean) => writeFlag(key, value), [key]);
  return [on, setOn];
}
