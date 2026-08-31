import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  authService,
  type AuthActionResult,
  type AuthCredentials,
} from '../services/authService';
import { activityService } from '../services/activityService';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: (credentials: AuthCredentials) => Promise<AuthActionResult>;
  signUp: (credentials: AuthCredentials) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        const initialSession = await authService.getSession();

        if (isMounted) {
          setSession(initialSession);
        }
      } catch (initializeError) {
        if (isMounted) {
          const message = initializeError instanceof Error
            ? initializeError.message
            : 'Failed to restore authentication session.';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeSession();

    const { unsubscribe } = authService.onAuthStateChange((nextSession) => {
      if (isMounted) {
        if (nextSession === null) {
          void activityService.disable().catch(() => undefined);
          void activityService.setAuthContext(null).catch(() => undefined);
        }

        setSession(nextSession);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (credentials: AuthCredentials) => {
    setError(null);
    const result = await authService.signIn(credentials);

    if (result.error) {
      setError(result.error);
    }

    return result;
  }, []);

  const signUp = useCallback(async (credentials: AuthCredentials) => {
    setError(null);
    const result = await authService.signUp(credentials);

    if (result.error) {
      setError(result.error);
    }

    return result;
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await activityService.disable().catch(() => undefined);
    await activityService.setAuthContext(null).catch(() => undefined);
    const result = await authService.signOut();

    if (result.error) {
      setError(result.error);
    }

    return result;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      error,
      signIn,
      signUp,
      signOut,
      clearError,
    }),
    [session, isLoading, error, signIn, signUp, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
