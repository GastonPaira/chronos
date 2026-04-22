// Inicialización del cliente Supabase y utilidad para identificar dispositivos anónimos.

import { createClient } from '@supabase/supabase-js';

/** Singleton Supabase client shared across the application. Uses implicit OAuth flow. */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'implicit',
    }
  }
);

const DEVICE_ID_KEY = 'chronos_device_id';

/**
 * Returns a stable, randomly generated UUID for the current browser.
 * The ID is created on first call and persisted in `localStorage` so that
 * anonymous users retain their stats and streak across sessions.
 *
 * @returns The device UUID string, or an empty string during SSR.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
