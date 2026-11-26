// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (event: string, session: unknown) => void;

const auth = vi.hoisted(() => ({
  state: {
    listeners: [] as Listener[],
  },
  unsubscribe: vi.fn(),
  api: {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
}));

vi.mock('@/store/supabase', () => ({ supabase: { auth: auth.api } }));

import { AuthProvider, useAuth } from '@/auth/AuthContext';

const user = {
  id: 'u-1',
  email: 'anna@example.com',
  user_metadata: { display_name: 'Анна' },
};

const session = { user };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper });
}

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  localStorage.clear();
  auth.state.listeners.length = 0;
  auth.unsubscribe.mockClear();

  auth.api.onAuthStateChange.mockImplementation((listener: Listener) => {
    auth.state.listeners.push(listener);
    return {
      data: { subscription: { unsubscribe: auth.unsubscribe } },
    };
  });
  auth.api.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.api.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: { code: 'invalid_credentials' },
  });
  auth.api.signOut.mockResolvedValue({ error: null });
  auth.api.signInWithOAuth.mockResolvedValue({ error: null });
});

function emitSession(event: string, value: unknown) {
  act(() => {
    for (const listener of auth.state.listeners) {
      listener(event, value);
    }
  });
}

describe('восстановление сессии', () => {
  it('до ответа Supabase держит restoring', () => {
    const pending = deferred<{ data: { session: unknown }; error: unknown }>();
    auth.api.getSession.mockReturnValue(pending.promise);

    const { result } = renderAuth();

    expect(result.current.status).toBe('restoring');
  });

  it('сессия из getSession переводит в signedIn', async () => {
    auth.api.getSession.mockResolvedValue({
      data: { session },
      error: null,
    });

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.status).toBe('signedIn'));
    expect(result.current.user).toEqual({
      id: 'u-1',
      email: 'anna@example.com',
      displayName: 'Анна',
    });
  });

  it('ошибка сети при getSession не оставляет вечную загрузку', async () => {
    auth.api.getSession.mockRejectedValue(new Error('boom'));

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.status).toBe('signedOut'));
    expect(result.current.user).toBeNull();
  });

  it('ответ getSession с error считается отсутствием сессии', async () => {
    auth.api.getSession.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthRetryableFetchError' },
    });

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.status).toBe('signedOut'));
  });

  it('поздний getSession не перетирает событие INITIAL_SESSION', async () => {
    const pending = deferred<{ data: { session: unknown }; error: unknown }>();
    auth.api.getSession.mockReturnValue(pending.promise);

    const { result } = renderAuth();
    emitSession('INITIAL_SESSION', session);

    expect(result.current.status).toBe('signedIn');

    await act(async () => {
      pending.resolve({ data: { session: null }, error: null });
      await pending.promise;
    });

    expect(result.current.status).toBe('signedIn');
    expect(result.current.user?.id).toBe('u-1');
  });

  it('SIGNED_OUT очищает пользователя', async () => {
    auth.api.getSession.mockResolvedValue({ data: { session }, error: null });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedIn'));

    emitSession('SIGNED_OUT', null);

    expect(result.current.status).toBe('signedOut');
    expect(result.current.user).toBeNull();
  });

  it('после размонтирования отписывается и не обновляет состояние', async () => {
    const pending = deferred<{ data: { session: unknown }; error: unknown }>();
    auth.api.getSession.mockReturnValue(pending.promise);

    const { unmount } = renderAuth();
    unmount();

    await act(async () => {
      pending.resolve({ data: { session: null }, error: null });
      await pending.promise;
    });

    expect(auth.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('legacy-ключ workout-tracker-session не пускает в приложение', async () => {
    localStorage.setItem(
      'workout-tracker-session',
      JSON.stringify({ userId: 'mock-user' })
    );
    auth.api.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.status).toBe('signedOut'));
    expect(localStorage.getItem('workout-tracker-session')).toContain('mock-user');
  });

  it('ошибка OAuth из URL попадает в состояние, а URL очищается', async () => {
    window.history.replaceState({}, '', '/?error=access_denied&code=abc');

    const { result } = renderAuth();

    expect(result.current.oauthError).toBe('oauth_cancelled');
    await waitFor(() => expect(window.location.search).toBe(''));

    act(() => result.current.clearOAuthError());
    expect(result.current.oauthError).toBeNull();
  });
});

describe('вход по email и паролю', () => {
  it('успешный вход выставляет пользователя', async () => {
    auth.api.signInWithPassword.mockResolvedValue({
      data: { user, session },
      error: null,
    });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedOut'));

    let authResult!: Awaited<ReturnType<typeof result.current.signInWithPassword>>;
    await act(async () => {
      authResult = await result.current.signInWithPassword(
        '  anna@example.com ',
        'secret'
      );
    });

    expect(authResult).toEqual({ ok: true });
    expect(auth.api.signInWithPassword).toHaveBeenCalledWith({
      email: 'anna@example.com',
      password: 'secret',
    });
    expect(result.current.status).toBe('signedIn');
    expect(result.current.user?.displayName).toBe('Анна');
  });

  it('неверные данные возвращают код и не меняют статус', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedOut'));

    let authResult!: Awaited<ReturnType<typeof result.current.signInWithPassword>>;
    await act(async () => {
      authResult = await result.current.signInWithPassword('anna@example.com', 'bad');
    });

    expect(authResult).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(result.current.status).toBe('signedOut');
  });

  it('ответ без сессии считается неизвестной ошибкой', async () => {
    auth.api.signInWithPassword.mockResolvedValue({
      data: { user, session: null },
      error: null,
    });
    const { result } = renderAuth();

    let authResult!: Awaited<ReturnType<typeof result.current.signInWithPassword>>;
    await act(async () => {
      authResult = await result.current.signInWithPassword('anna@example.com', 'secret');
    });

    expect(authResult).toEqual({ ok: false, error: 'unknown' });
  });
});

describe('регистрация по email', () => {
  it.each([
    { base: '/', displayName: undefined, metadata: undefined },
    { base: '/setsly/', displayName: 'Анна', metadata: { display_name: 'Анна' } },
  ])('задаёт адрес подтверждения с базовым путём $base', async ({
    base,
    displayName,
    metadata,
  }) => {
    vi.stubEnv('BASE_URL', base);
    try {
      auth.api.signUp.mockResolvedValue({
        data: { user: { ...user, identities: [{ provider: 'email' }] }, session: null },
        error: null,
      });
      const { result } = renderAuth();
      await waitFor(() => expect(result.current.status).toBe('signedOut'));

      await act(async () => {
        expect(await result.current.signUp(user.email, 'test-password', displayName))
          .toEqual({ ok: true });
      });

      expect(auth.api.signUp).toHaveBeenCalledWith({
        email: user.email,
        password: 'test-password',
        options: {
          emailRedirectTo: window.location.origin + base,
          data: metadata,
        },
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('выход', () => {
  it('session_not_found считается успешным выходом', async () => {
    auth.api.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.api.signOut.mockResolvedValue({
      error: { code: 'session_not_found', name: 'AuthSessionMissingError' },
    });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedIn'));

    let authResult!: Awaited<ReturnType<typeof result.current.signOut>>;
    await act(async () => {
      authResult = await result.current.signOut();
    });

    expect(authResult).toEqual({ ok: true });
    expect(result.current.status).toBe('signedOut');
  });

  it('ошибка сети оставляет пользователя в системе', async () => {
    auth.api.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.api.signOut.mockResolvedValue({
      error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' },
    });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedIn'));

    let authResult!: Awaited<ReturnType<typeof result.current.signOut>>;
    await act(async () => {
      authResult = await result.current.signOut();
    });

    expect(authResult).toEqual({ ok: false, error: 'network' });
    expect(result.current.status).toBe('signedIn');
    expect(result.current.user?.id).toBe('u-1');
  });

  it('успешный выход очищает пользователя', async () => {
    auth.api.getSession.mockResolvedValue({ data: { session }, error: null });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedIn'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.status).toBe('signedOut');
    expect(result.current.user).toBeNull();
  });
});

describe('Google OAuth', () => {
  it('запуск входа возвращает ok', async () => {
    const { result } = renderAuth();

    let authResult!: Awaited<ReturnType<typeof result.current.signInWithGoogle>>;
    await act(async () => {
      authResult = await result.current.signInWithGoogle();
    });

    expect(authResult).toEqual({ ok: true });
    expect(auth.api.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    );
  });

  it('ошибка провайдера не маскируется под неверный пароль', async () => {
    auth.api.signInWithOAuth.mockResolvedValue({
      error: { code: 'invalid_credentials' },
    });
    const { result } = renderAuth();

    let authResult!: Awaited<ReturnType<typeof result.current.signInWithGoogle>>;
    await act(async () => {
      authResult = await result.current.signInWithGoogle();
    });

    expect(authResult).toEqual({ ok: false, error: 'oauth_failed' });
  });
});
