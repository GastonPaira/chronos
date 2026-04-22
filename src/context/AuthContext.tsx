// Contexto de autenticación: provee el usuario y sesión de Supabase a toda la app.

import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Shape of the value provided by `AuthContext`.
 *
 * @property user - The currently authenticated Supabase user, or `null` when signed out.
 * @property session - The active Supabase session (contains tokens), or `null` when signed out.
 * @property loading - `true` while the initial session is being fetched from Supabase.
 */
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

/**
 * Wraps the application with Supabase authentication state.
 *
 * On mount, fetches the existing session and subscribes to auth state changes
 * so that login, logout, and token-refresh events are reflected automatically.
 *
 * @param children - Child nodes that will have access to the auth context.
 *
 * Side effects: subscribes to `supabase.auth.onAuthStateChange`; the listener
 * is cleaned up when the provider unmounts.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Returns the current authentication context.
 * Must be used inside an `AuthProvider`.
 *
 * @returns `{ user, session, loading }` from the nearest `AuthProvider`.
 */
export const useAuth = () => useContext(AuthContext);
