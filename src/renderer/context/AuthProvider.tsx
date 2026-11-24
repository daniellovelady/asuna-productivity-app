import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  authService,
  type AuthActionResult,
  type AuthCredentials,
} from '../services/authService';
import { authContextBridgeService } from '../services/authContextBridgeService';
import { resolveAuthContextTimeZone } from '../services/authContextTimeZone';
import { finalizeFocusSessionsBeforeAuthChange } from '../services/focusSessionLifecycleService';
import { rendererBootLog } from '../diagnostics/rendererBoot';
import { useRendererBootMarker } from '../diagnostics/useRendererBootMarker';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  authContextReady: boolean;
  error: string | null;
  signIn: (credentials: AuthCredentials) => Promise<AuthActionResult>;
  signUp: (credentials: AuthCredentials) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  useRendererBootMarker('AuthProvider-mounted');
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authContextReady, setAuthContextReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rendererGeneration, setRendererGeneration] = useState<number | null>(null);
  const authContextSequenceRef = useRef(0);
  const rendererGenerationRef = useRef<number | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  const syncAuthContext = useCallback(async (userId: string | null): Promise<boolean> => {
    const generation = rendererGenerationRef.current;

    if (generation === null) {
      return false;
    }

    authContextSequenceRef.current += 1;
    const timeZone = await resolveAuthContextTimeZone(userId);
    const { applied } = await authContextBridgeService.sync(
      userId,
      authContextSequenceRef.current,
      generation,
      timeZone,
    );

    if (applied) {
      setAuthContextReady(true);
    }

    return applied;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const registerRenderer = async () => {
      const { generation } = await authContextBridgeService.registerRenderer();

      if (!isMounted) {
        return;
      }

      rendererGenerationRef.current = generation;
      setRendererGeneration(generation);
    };

    void registerRenderer();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      rendererBootLog('auth-initialization-start');
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
          rendererBootLog('auth-initialization-complete');
        }
      }
    };

    initializeSession();

    const { unsubscribe } = authService.onAuthStateChange((nextSession) => {
      if (isMounted) {
        if (nextSession === null) {
          void finalizeFocusSessionsBeforeAuthChange()
            .then(() => syncAuthContext(null))
            .catch(() => undefined);
        }

        setSession(nextSession);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [syncAuthContext]);

  useEffect(() => {
    if (rendererGeneration === null || isLoading) {
      return;
    }

    const nextUserId = session?.user?.id ?? null;
    const previousUserId = previousUserIdRef.current;

    if (nextUserId === null) {
      if (previousUserId !== null) {
        previousUserIdRef.current = null;
      }

      setAuthContextReady(false);
      void syncAuthContext(null).catch(() => undefined);
      return;
    }

    const syncForUser = async () => {
      if (previousUserId !== null && previousUserId !== nextUserId) {
        await finalizeFocusSessionsBeforeAuthChange();
      }

      setAuthContextReady(false);
      await syncAuthContext(nextUserId);
    };

    previousUserIdRef.current = nextUserId;
    void syncForUser().catch(() => undefined);
  }, [session?.user?.id, isLoading, syncAuthContext, rendererGeneration]);

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
    await finalizeFocusSessionsBeforeAuthChange();
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
      authContextReady,
      error,
      signIn,
      signUp,
      signOut,
      clearError,
    }),
    [session, isLoading, authContextReady, error, signIn, signUp, signOut, clearError],
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
