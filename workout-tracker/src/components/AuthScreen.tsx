import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/auth/AuthContext';
import { getAuthErrorMessage } from '@/auth/errors';

export default function AuthScreen() {
  const { signInWithPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    setError(null);
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

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col justify-center py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Workout Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Настоящий вход, данные пока локальные
          </p>
        </header>

        <div role="note" className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">Вход через Supabase Auth</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Email и пароль проверяются на сервере Supabase. Приложение не
            сохраняет пароль. Тренировки пока хранятся только в этом браузере.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Вход...' : 'Войти'}
              </Button>
            </form>

            <div className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
              <p>Вход по коду и через Google в этой версии отключены.</p>
              <p>
                Регистрация и восстановление пароля не входят в эту версию.
                Аккаунты создаются в Supabase.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Сессию хранит Supabase, после перезагрузки она восстанавливается.
          Тренировки пока не синхронизируются между устройствами.
        </p>
      </div>
    </div>
  );
}
