// Inicialización del cliente Supabase.

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
