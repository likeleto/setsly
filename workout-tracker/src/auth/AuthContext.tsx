import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { store } from '@/store';
import {
  findDemoUserByCredentials,
  findDemoUserByEmail,
  findDemoUserById,
  type DemoUser,
} from '@/auth/demoUsers';

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'user_not_found'
  | 'code_not_requested'
  | 'invalid_code'
  | 'unknown';

export type AuthResult =
  | { ok: true }
  | { ok: false; error: AuthErrorCode };

export type CodeRequestResult =
  | { ok: true; code: string }
  | { ok: false; error: AuthErrorCode };

export interface AuthApi {
  user: DemoUser | null;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  requestCode: (email: string) => Promise<CodeRequestResult>;
  verifyCode: (email: string, code: string) => Promise<AuthResult>;
  /**
   * Mock-вход после выбора в локальном диалоге.
   * В реальном провайдере вместо accountId будет ответ OAuth.
   */
  signInWithGoogle: (accountId: string) => Promise<AuthResult>;
  signOut: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);

const MOCK_DELAY_MS = 450;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readInitialUser(): DemoUser | null {
  const userId = store.getSession();
  if (!userId) return null;

  const user = findDemoUserById(userId);
  if (!user) {
    store.clearSession();
    return null;
  }
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(readInitialUser);
  const pendingCodes = useRef<Map<string, string>>(new Map());

  const finishSignIn = useCallback((demoUser: DemoUser) => {
    store.setSession(demoUser.id);
    setUser(demoUser);
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      await delay(MOCK_DELAY_MS);

      const demoUser = findDemoUserByCredentials(email, password);
      if (!demoUser) {
        return { ok: false, error: 'invalid_credentials' };
      }

      finishSignIn(demoUser);
      return { ok: true };
    },
    [finishSignIn]
  );

  const requestCode = useCallback(
    async (email: string): Promise<CodeRequestResult> => {
      await delay(MOCK_DELAY_MS);

      const demoUser = findDemoUserByEmail(email);
      if (!demoUser) {
        return { ok: false, error: 'user_not_found' };
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      pendingCodes.current.set(demoUser.id, code);
      return { ok: true, code };
    },
    []
  );

  const verifyCode = useCallback(
    async (email: string, code: string): Promise<AuthResult> => {
      await delay(MOCK_DELAY_MS);

      const demoUser = findDemoUserByEmail(email);
      if (!demoUser) {
        return { ok: false, error: 'user_not_found' };
      }

      const expected = pendingCodes.current.get(demoUser.id);
      if (!expected) {
        return { ok: false, error: 'code_not_requested' };
      }
      if (expected !== code.trim()) {
        return { ok: false, error: 'invalid_code' };
      }

      pendingCodes.current.delete(demoUser.id);
      finishSignIn(demoUser);
      return { ok: true };
    },
    [finishSignIn]
  );

  const signInWithGoogle = useCallback(
    async (accountId: string): Promise<AuthResult> => {
      await delay(MOCK_DELAY_MS);

      const demoUser = findDemoUserById(accountId);
      if (!demoUser) {
        return { ok: false, error: 'unknown' };
      }

      finishSignIn(demoUser);
      return { ok: true };
    },
    [finishSignIn]
  );

  const signOut = useCallback(() => {
    store.clearSession();
    pendingCodes.current.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthApi>(
    () => ({
      user,
      signInWithPassword,
      requestCode,
      verifyCode,
      signInWithGoogle,
      signOut,
    }),
    [user, signInWithPassword, requestCode, verifyCode, signInWithGoogle, signOut]
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
