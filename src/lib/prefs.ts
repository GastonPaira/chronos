// Preferencias de audio del jugador (sonido, ambiente, lectura automática, modo escucha).
// Se guardan en el dispositivo y avisan a quien las escuche, así los botones y el audio siempre coinciden.

export type FlagKey = 'chronos_sound' | 'chronos_ambience' | 'chronos_autoread' | 'chronos_listen';

/** Value used when the player never chose. Listening mode is an exercise, so it starts off. */
const DEFAULTS: Record<FlagKey, boolean> = {
  chronos_sound: true,
  chronos_ambience: true,
  chronos_autoread: true,
  chronos_listen: false,
};

const listeners = new Set<() => void>();

/** What a preference is before the player chooses (also what the server renders). */
export function defaultFlag(key: FlagKey): boolean {
  return DEFAULTS[key];
}

export function readFlag(key: FlagKey): boolean {
  if (typeof window === 'undefined') return DEFAULTS[key];
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return DEFAULTS[key];
    return value === 'on';
  } catch {
    return DEFAULTS[key];
  }
}

export function writeFlag(key: FlagKey, on: boolean): void {
  try {
    window.localStorage.setItem(key, on ? 'on' : 'off');
  } catch {
    // Storage blocked: the choice just won't be remembered.
  }
  listeners.forEach(listener => listener());
}

/** Calls `listener` whenever any preference changes. Returns the unsubscribe function. */
export function subscribePrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
