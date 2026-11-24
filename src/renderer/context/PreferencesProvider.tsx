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
import type { UserPreferences } from '../../shared/preferences/types';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import { useAuth } from '../hooks/useAuth';
import { preferencesBridgeService } from '../services/preferencesBridgeService';
import {
  PreferencesServiceError,
  preferencesService,
} from '../services/preferencesService';

type PreferencesContextValue = {
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (update: Partial<UserPreferences>) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }): JSX.Element {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequenceRef = useRef(0);
  const loadGenerationRef = useRef(0);

  const syncToMain = useCallback(async (
    userId: string,
    sequence: number,
    nextPreferences: UserPreferences,
  ) => {
    await preferencesBridgeService.sync(userId, sequence, nextPreferences);
  }, []);

  const resetState = useCallback(async () => {
    sequenceRef.current += 1;
    const sequence = sequenceRef.current;
    setPreferences(DEFAULT_USER_PREFERENCES);
    setError(null);
    await preferencesBridgeService.reset(sequence);
  }, []);

  useEffect(() => {
    if (!user) {
      loadGenerationRef.current += 1;
      void resetState().finally(() => {
        setIsLoading(false);
      });
      return undefined;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const loaded = await preferencesService.getPreferences();
        if (!isMounted || loadGenerationRef.current !== generation) {
          return;
        }

        sequenceRef.current += 1;
        const sequence = sequenceRef.current;
        setPreferences(loaded);
        setError(null);
        await syncToMain(user.id, sequence, loaded);
      } catch (loadError) {
        if (!isMounted || loadGenerationRef.current !== generation) {
          return;
        }

        const message = loadError instanceof PreferencesServiceError
          ? loadError.message
          : 'Failed to load preferences.';
        setError(message);
      } finally {
        if (isMounted && loadGenerationRef.current === generation) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [user, resetState, syncToMain]);

  const updatePreferences = useCallback(async (update: Partial<UserPreferences>) => {
    if (!user) {
      throw new PreferencesServiceError('You must be signed in to update preferences.');
    }

    const previous = preferences;
    const optimistic = { ...previous, ...update };
    sequenceRef.current += 1;
    const sequence = sequenceRef.current;

    setPreferences(optimistic);
    setError(null);
    await syncToMain(user.id, sequence, optimistic);

    try {
      const saved = await preferencesService.updatePreferences(update);
      sequenceRef.current += 1;
      const savedSequence = sequenceRef.current;
      setPreferences(saved);
      await syncToMain(user.id, savedSequence, saved);
    } catch (saveError) {
      sequenceRef.current += 1;
      const rollbackSequence = sequenceRef.current;
      setPreferences(previous);
      await syncToMain(user.id, rollbackSequence, previous);

      const message = saveError instanceof PreferencesServiceError
        ? saveError.message
        : 'Failed to update preferences.';
      setError(message);
      throw saveError;
    }
  }, [preferences, syncToMain, user]);

  const value = useMemo(
    () => ({
      preferences,
      isLoading,
      error,
      updatePreferences,
    }),
    [preferences, isLoading, error, updatePreferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider.');
  }
  return context;
}
