import { describe, expect, it, vi } from 'vitest';
import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js';

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

import { createAuthService, mapAuthError } from './authService';

function createAuthError(message: string, status = 400): AuthError {
  return {
    name: 'AuthError',
    message,
    status,
    code: 'test_error',
    __isAuthError: true,
  } as AuthError;
}

function createMockClient(): SupabaseClient {
  const unsubscribe = vi.fn();

  return {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe } },
      })),
    },
  } as unknown as SupabaseClient;
}

describe('mapAuthError', () => {
  it('maps invalid login credentials', () => {
    expect(mapAuthError(createAuthError('Invalid login credentials'))).toBe(
      'Invalid email or password.',
    );
  });

  it('maps email not confirmed', () => {
    expect(mapAuthError(createAuthError('Email not confirmed'))).toBe(
      'Please confirm your email before signing in.',
    );
  });

  it('maps user already registered', () => {
    expect(mapAuthError(createAuthError('User already registered'))).toBe(
      'An account with this email already exists.',
    );
  });

  it('returns generic message for null error', () => {
    expect(mapAuthError(null)).toBe('An unexpected error occurred.');
  });
});

describe('createAuthService', () => {
  it('returns session from getSession', async () => {
    const client = createMockClient();
    const session = { access_token: 'token' } as Session;

    vi.mocked(client.auth.getSession).mockResolvedValue({
      data: { session },
      error: null,
    });

    const service = createAuthService(client);
    await expect(service.getSession()).resolves.toEqual(session);
  });

  it('maps signInWithPassword errors', async () => {
    const client = createMockClient();

    vi.mocked(client.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: createAuthError('Invalid login credentials'),
    });

    const service = createAuthService(client);
    const result = await service.signIn({
      email: 'user@example.com',
      password: 'wrong-password',
    });

    expect(result.error).toBe('Invalid email or password.');
    expect(result.needsEmailConfirmation).toBe(false);
  });

  it('returns success from signInWithPassword', async () => {
    const client = createMockClient();

    vi.mocked(client.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'user-id' } as never, session: { access_token: 'token' } as Session },
      error: null,
    });

    const service = createAuthService(client);
    const result = await service.signIn({
      email: 'user@example.com',
      password: 'password',
    });

    expect(result.error).toBeNull();
    expect(result.needsEmailConfirmation).toBe(false);
  });

  it('detects email confirmation requirement after signUp', async () => {
    const client = createMockClient();

    vi.mocked(client.auth.signUp).mockResolvedValue({
      data: {
        user: { id: 'user-id' } as never,
        session: null,
      },
      error: null,
    });

    const service = createAuthService(client);
    const result = await service.signUp({
      email: 'user@example.com',
      password: 'password',
    });

    expect(result.error).toBeNull();
    expect(result.needsEmailConfirmation).toBe(true);
  });

  it('maps signUp errors', async () => {
    const client = createMockClient();

    vi.mocked(client.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: createAuthError('User already registered'),
    });

    const service = createAuthService(client);
    const result = await service.signUp({
      email: 'user@example.com',
      password: 'password',
    });

    expect(result.error).toBe('An account with this email already exists.');
  });

  it('signs out successfully', async () => {
    const client = createMockClient();

    vi.mocked(client.auth.signOut).mockResolvedValue({ error: null });

    const service = createAuthService(client);
    const result = await service.signOut();

    expect(result.error).toBeNull();
  });

  it('subscribes to auth state changes', () => {
    const client = createMockClient();
    const callback = vi.fn();
    const service = createAuthService(client);

    const { unsubscribe } = service.onAuthStateChange(callback);

    expect(client.auth.onAuthStateChange).toHaveBeenCalled();
    unsubscribe();
  });
});
