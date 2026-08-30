import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthActionResult = {
  error: string | null;
  needsEmailConfirmation: boolean;
};

export function mapAuthError(error: AuthError | Error | null): string {
  if (!error) {
    return 'An unexpected error occurred.';
  }

  if (error instanceof Error && !('status' in error)) {
    return error.message;
  }

  const authError = error as AuthError;
  const message = authError.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  if (message.includes('user already registered')) {
    return 'An account with this email already exists.';
  }

  if (message.includes('password')) {
    return 'Password does not meet requirements.';
  }

  if (message.includes('invalid email')) {
    return 'Enter a valid email address.';
  }

  if (authError.status === 0 || message.includes('fetch')) {
    return 'Unable to reach the authentication service. Check your connection.';
  }

  return authError.message;
}

export function createAuthService(client: SupabaseClient) {
  return {
    getSession: async (): Promise<Session | null> => {
      const { data, error } = await client.auth.getSession();

      if (error) {
        throw new Error(mapAuthError(error));
      }

      return data.session;
    },

    signIn: async (credentials: AuthCredentials): Promise<AuthActionResult> => {
      const { error } = await client.auth.signInWithPassword(credentials);

      if (error) {
        return {
          error: mapAuthError(error),
          needsEmailConfirmation: false,
        };
      }

      return {
        error: null,
        needsEmailConfirmation: false,
      };
    },

    signUp: async (credentials: AuthCredentials): Promise<AuthActionResult> => {
      const { data, error } = await client.auth.signUp(credentials);

      if (error) {
        return {
          error: mapAuthError(error),
          needsEmailConfirmation: false,
        };
      }

      const needsEmailConfirmation = data.session === null && data.user !== null;

      return {
        error: null,
        needsEmailConfirmation,
      };
    },

    signOut: async (): Promise<AuthActionResult> => {
      const { error } = await client.auth.signOut();

      if (error) {
        return {
          error: mapAuthError(error),
          needsEmailConfirmation: false,
        };
      }

      return {
        error: null,
        needsEmailConfirmation: false,
      };
    },

    onAuthStateChange: (
      callback: (session: Session | null) => void,
    ): { unsubscribe: () => void } => {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        callback(session);
      });

      return {
        unsubscribe: () => {
          data.subscription.unsubscribe();
        },
      };
    },
  };
}

export const authService = createAuthService(supabase);
