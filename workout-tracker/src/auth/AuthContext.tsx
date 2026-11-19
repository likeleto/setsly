import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/store/supabase';
import {
  mapAuthError,
  mapOAuthError,
  type AuthErrorCode,
  type AuthResult,
} from '@/auth/errors';
import {
  clearAuthRedirectParams,
  hasAuthRedirectParams,
  readOAuthRedirectError,
} from '@/auth/oauthRedirect';
import { toAuthUser, type AuthUser } from '@/auth/user';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

export interface AuthApi {
  status: AuthStatus;
  user: AuthUser | null;
  oauthError: AuthErrorCode | null;
  resetSent: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<{ ok: true } | { ok: false; error: AuthErrorCode }>;
  signInWithGoogle: () => Promise<AuthResult>;
  clearOAuthError: () => void;
  clearResetSent: () => void;
  signOut: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthApi | null>(null);

type SupabaseSession = Awaited<
  ReturnType<typeof supabase.auth.getSession>
>['data']['session'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [oauthError, setOauthError] = useState<AuthErrorCode | null>(() =>
    readOAuthRedirectError()
  );
  const [resetSent, setResetSent] = useState(false);

  // Ошибка уже прочитана в состояние — параметры из URL больше не нужны.
  // Успешный ответ Google тоже содержит токены: им не место в истории браузера.
  useEffect(() => {
    if (hasAuthRedirectParams()) {
      clearAuthRedirectParams();
    }
  }, []);

  const applySession = useCallback((session: SupabaseSession) => {
    if (session?.user) {
      setUser(toAuthUser(session.user));
      setStatus('signedIn');
      return;
    }

    setUser(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      receivedAuthEvent = true;
      applySession(session);
    });

    // Страховка на случай, если событие INITIAL_SESSION ещё не пришло.
    // Не перетираем более свежее событие авторизации.
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || receivedAuthEvent) return;
        applySession(error ? null : data.session);
      })
      .catch(() => {
        if (!active || receivedAuthEvent) return;
        applySession(null);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          return { ok: false, error: mapAuthError(error) };
        }
        if (!data.user || !data.session) {
          return { ok: false, error: 'unknown' };
        }

        setUser(toAuthUser(data.user));
        setStatus('signedIn');
        return { ok: true };
      } catch (error) {
        return { ok: false, error: mapAuthError(error) };
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    setOauthError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Совпадает с Site URL в настройках Supabase Auth.
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { ok: false, error: mapOAuthError(error) };
      }

      // Браузер уже уходит на страницу Google; сессию подхватит
      // onAuthStateChange после возврата на Site URL.
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapOAuthError(error) };
    }
  }, []);

  const clearOAuthError = useCallback(() => {
    setOauthError(null);
  }, []);

  const clearResetSent = useCallback(() => {
    setResetSent(false);
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signOut();

      // Сессии уже нет — считаем выход успешным.
      if (
        error &&
        error.code !== 'session_not_found' &&
        error.name !== 'AuthSessionMissingError'
      ) {
        return { ok: false, error: mapAuthError(error) };
      }

      setUser(null);
      setStatus('signedOut');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapAuthError(error) };
    }
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string
    ): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          data: displayName ? { display_name: displayName } : undefined,
        });

        if (error) {
          return { ok: false, error: mapAuthError(error) };
        }

        return { ok: true };
      } catch (error) {
        return { ok: false, error: mapAuthError(error) };
      }
    },
    []
  );

  const resetPassword = useCallback(
    async (email: string): Promise<{ ok: true } | { ok: false; error: AuthErrorCode }> => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });

        if (error) {
          return { ok: false, error: mapAuthError(error) };
        }

        return { ok: true };
      } catch (error) {
        return { ok: false, error: mapAuthError(error) };
      }
    },
    []
  );

  const value = useMemo<AuthApi>(
    () => ({
      status,
      user,
      oauthError,
      resetSent,
      signInWithPassword,
      signUp,
      resetPassword,
      signInWithGoogle,
      clearOAuthError,
      clearResetSent,
      signOut,
    }),
    [
      status,
      user,
      oauthError,
      resetSent,
      signInWithPassword,
      signUp,
      resetPassword,
      signInWithGoogle,
      clearOAuthError,
      clearResetSent,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
