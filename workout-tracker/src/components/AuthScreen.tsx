import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/auth/AuthContext';
import { getAuthErrorMessage } from '@/auth/errors';

export default function AuthScreen() {
  const { signInWithPassword, signInWithGoogle, oauthError, clearOAuthError } =
    useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const googleSubmittingRef = useRef(false);

  const isBusy = isSubmitting || isGoogleSubmitting;
  const displayedGoogleError =
    googleError ?? (oauthError ? getAuthErrorMessage(oauthError) : null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || isGoogleSubmitting) return;

    setError(null);
    setGoogleError(null);
    clearOAuthError();
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
  };

  const handleGoogleSignIn = async () => {
    if (googleSubmittingRef.current || isSubmitting) return;

    googleSubmittingRef.current = true;
    setError(null);
    setGoogleError(null);
    clearOAuthError();
    setIsGoogleSubmitting(true);

    const result = await signInWithGoogle();

    // При успехе браузер уходит на страницу Google, поэтому состояние
    // загрузки не сбрасываем: так кнопка не мигнёт перед переходом.
    if (!result.ok) {
      googleSubmittingRef.current = false;
      setIsGoogleSubmitting(false);
      setGoogleError(getAuthErrorMessage(result.error));
    }
  };

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
            Google и email с паролем проверяются на сервере Supabase. Приложение
            не сохраняет пароль. Тренировки хранятся в Postgres и доступны
            только после входа.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="space-y-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isBusy}
                aria-busy={isGoogleSubmitting}
                onClick={() => void handleGoogleSignIn()}
              >
                {isGoogleSubmitting
                  ? 'Переходим в Google...'
                  : 'Войти через Google'}
              </Button>

              {displayedGoogleError && (
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

              <div className="space-y-1.5">
                <label htmlFor="auth-password" className="text-sm font-medium">
                  Пароль
                </label>
                <Input
                  id="auth-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Пароль"
                  value={password}
                  disabled={isBusy}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isBusy}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Вход...' : 'Войти'}
              </Button>
            </form>

            <div className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
              <p>
                Google и email с паролем проверяются в Supabase Auth. Вход по
                коду не поддерживается.
              </p>
              <p>
                Регистрация и восстановление пароля не входят в эту версию.
                Аккаунты создаются в Supabase.
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
