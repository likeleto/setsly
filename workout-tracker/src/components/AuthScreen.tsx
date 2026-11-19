import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/auth/AuthContext';
import { getAuthErrorMessage } from '@/auth/errors';

type AuthMode = 'login' | 'register' | 'reset';

const MODE_LABELS: Record<AuthMode, string> = {
  login: 'Войти',
  register: 'Зарегистрироваться',
  reset: 'Восстановить пароль',
};

export default function AuthScreen() {
  const {
    signInWithPassword,
    signUp,
    resetPassword,
    signInWithGoogle,
    oauthError,
    clearOAuthError,
    resetSent,
    clearResetSent,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const googleSubmittingRef = useRef(false);

  const isBusy = isSubmitting || isGoogleSubmitting;
  const displayedGoogleError =
    googleError ?? (oauthError ? getAuthErrorMessage(oauthError) : null);

  const resetForm = () => {
    setDisplayName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setGoogleError(null);
    clearOAuthError();
    clearResetSent();
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || isGoogleSubmitting) return;

    setError(null);
    setGoogleError(null);
    clearOAuthError();

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Введите email и пароль.');
        return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);

      const result = await signInWithPassword(email, password);

      if (!result.ok) {
        submittingRef.current = false;
        setIsSubmitting(false);
        setError(getAuthErrorMessage(result.error));
      }
    }

    if (mode === 'register') {
      const trim = displayName.trim();
      if (!email.trim() || !password || !confirmPassword) {
        setError('Заполните все поля.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Пароли не совпадают.');
        return;
      }
      if (password.length < 6) {
        setError('Пароль должен быть не менее 6 символов.');
        return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);

      const result = await signUp(email, password, trim || undefined);

      if (!result.ok) {
        submittingRef.current = false;
        setIsSubmitting(false);
        setError(getAuthErrorMessage(result.error));
      } else {
        setIsSubmitting(false);
        setMode('reset');
        // Show success message via the reset form
      }
    }

    if (mode === 'reset') {
      if (!email.trim()) {
        setError('Введите email.');
        return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);

      const result = await resetPassword(email);

      if (!result.ok) {
        submittingRef.current = false;
        setIsSubmitting(false);
        setError(getAuthErrorMessage(result.error));
      } else {
        clearResetSent();
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleSubmittingRef.current || isSubmitting) return;

    googleSubmittingRef.current = true;
    setError(null);
    setGoogleError(null);
    clearOAuthError();
    setIsGoogleSubmitting(true);

    const result = await signInWithGoogle();

    if (!result.ok) {
      googleSubmittingRef.current = false;
      setIsGoogleSubmitting(false);
      setGoogleError(getAuthErrorMessage(result.error));
    }
  };

  const renderResetSuccess = () => (
    <div role="status" className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
      <p>Ссылка для сброса отправлена на <strong>{email || 'ваш email'}</strong>.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Проверьте почту (включая папку «Спам»). Ссылка ведёт на страницу Supabase.
      </p>
      <Button
        variant="link"
        className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
        type="button"
        onClick={() => switchMode('login')}
      >
        Вернуться к входу
      </Button>
    </div>
  );

  const renderRegisterSuccess = () => (
    <div role="status" className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
      <p>Регистрация прошла успешно. На ваш email отправлено письмо с подтверждением.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Подтвердите email по письму от Supabase, затем войдите.
      </p>
      <Button
        variant="link"
        className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
        type="button"
        onClick={() => switchMode('login')}
      >
        Перейти ко входу
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col justify-center py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Workout Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Вход через Supabase Auth, тренировки в Postgres
          </p>
        </header>

        <div role="note" className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">Вход через Supabase Auth</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Google, email с паролем, регистрация и восстановление — всё на
            сервере Supabase. Приложение не сохраняет пароль. Тренировки
            хранятся в Postgres и доступны только после входа.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            {/* Mode switcher */}
            <div className="flex rounded-lg border border-border p-1">
              {(Object.keys(MODE_LABELS) as AuthMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    mode === m
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  disabled={m === 'register' && mode === 'login'}
                  onClick={() => switchMode(m)}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>

            <div role="note" className="space-y-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isBusy || mode !== 'login'}
                aria-busy={isGoogleSubmitting}
                onClick={() => void handleGoogleSignIn()}
              >
                {isGoogleSubmitting
                  ? 'Переходим в Google...'
                  : 'Войти через Google'}
              </Button>

              {displayedGoogleError && mode === 'login' && (
                <p role="alert" className="text-sm text-destructive">
                  {displayedGoogleError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>или по email</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form
              className="space-y-3"
              onSubmit={handleSubmit}
              autoComplete="on"
              noValidate
            >
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-display-name" className="text-sm font-medium">
                    Имя <span className="text-muted-foreground">(необязательно)</span>
                  </label>
                  <Input
                    id="auth-display-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Иван"
                    value={displayName}
                    disabled={isBusy}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="auth-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  disabled={isBusy}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              {mode !== 'reset' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-password" className="text-sm font-medium">
                    Пароль
                  </label>
                  <Input
                    id="auth-password"
                    type="password"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    placeholder={mode === 'register' ? 'Минимум 6 символов' : 'Пароль'}
                    value={password}
                    disabled={isBusy}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              )}

              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-confirm-password" className="text-sm font-medium">
                    Подтверждение пароля
                  </label>
                  <Input
                    id="auth-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    disabled={isBusy}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              {mode === 'login' && isSubmitting && (
                <p className="text-sm">Вход...</p>
              )}
              {mode === 'login' && (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isBusy}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? 'Вход...' : 'Войти'}
                </Button>
              )}

              {mode === 'register' && (
                <>
                  {resetSent && renderRegisterSuccess()}
                  {!resetSent && (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isBusy}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
                    </Button>
                  )}
                </>
              )}

              {mode === 'reset' && (
                <>
                  {resetSent ? renderResetSuccess() : (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isBusy}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? 'Отправляем...' : 'Отправить ссылку'}
                    </Button>
                  )}
                </>
              )}
            </form>

            <div className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
              <p>
                Google, email с паролем, регистрация и восстановление управляются
                в Supabase Auth. Вход по коду не поддерживается.
              </p>
              <p>
                Регистрация и восстановление пароля управляются через Supabase Auth.
                Письма приходят с домена Supabase.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Сессию хранит Supabase, после перезагрузки она восстанавливается.
          Тренировки хранятся на сервере.
        </p>
      </div>
    </div>
  );
}
