import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import GoogleAccountDialog from '@/components/GoogleAccountDialog';
import {
  DEMO_USERS,
  getDemoUserInitials,
} from '@/auth/demoUsers';
import {
  useAuth,
  type AuthErrorCode,
} from '@/auth/AuthContext';

type Method = 'password' | 'code';
type CodeStep = 'email' | 'code';
type CodeStatus = 'idle' | 'requesting' | 'verifying';

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Неверный email или пароль.',
  user_not_found: 'Аккаунт с таким email не найден.',
  code_not_requested: 'Сначала получите код.',
  invalid_code: 'Неверный код. Проверьте цифры или получите новый код.',
  unknown: 'Не удалось выполнить вход. Попробуйте ещё раз.',
};

function getErrorMessage(error?: AuthErrorCode): string {
  return error
    ? AUTH_ERROR_MESSAGES[error]
    : 'Не удалось выполнить вход. Попробуйте ещё раз.';
}

export default function AuthScreen() {
  const { signInWithPassword, requestCode, verifyCode, signInWithGoogle } =
    useAuth();

  const [method, setMethod] = useState<Method>('password');

  const [passwordEmail, setPasswordEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordChecking, setIsPasswordChecking] = useState(false);

  const [codeEmail, setCodeEmail] = useState('');
  const [codeStep, setCodeStep] = useState<CodeStep>('email');
  const [code, setCode] = useState('');
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<CodeStatus>('idle');

  const [googleOpen, setGoogleOpen] = useState(false);
  const [googleBusyId, setGoogleBusyId] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const isBusy =
    isPasswordChecking || codeStatus !== 'idle' || googleBusyId !== null;

  const switchMethod = (nextMethod: Method) => {
    if (isBusy || nextMethod === method) return;
    setMethod(nextMethod);
    setPassword('');
    setPasswordError(null);
    setCodeError(null);
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPasswordChecking) return;

    setPasswordError(null);
    if (!passwordEmail.trim() || !password) {
      setPasswordError('Введите email и пароль.');
      return;
    }

    setIsPasswordChecking(true);
    const result = await signInWithPassword(passwordEmail, password);

    if (!result.ok) {
      setIsPasswordChecking(false);
      setPasswordError(getErrorMessage(result.error));
    }
  };

  const requestDemoCode = async (email: string) => {
    if (codeStatus !== 'idle') return;

    setCodeError(null);
    if (!email.trim()) {
      setCodeError('Введите email.');
      return;
    }

    setCodeStatus('requesting');
    const result = await requestCode(email);
    setCodeStatus('idle');

    if (!result.ok) {
      setCodeError(getErrorMessage(result.error));
      return;
    }

    setIssuedCode(result.code);
    setCode('');
    setCodeStep('code');
  };

  const handleCodeRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void requestDemoCode(codeEmail);
  };

  const handleCodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (codeStatus !== 'idle') return;

    setCodeError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError('Введите 6 цифр.');
      return;
    }

    setCodeStatus('verifying');
    const result = await verifyCode(codeEmail, code);

    if (!result.ok) {
      setCodeStatus('idle');
      setCodeError(getErrorMessage(result.error));
    }
  };

  const handleChangeEmail = () => {
    setCodeStep('email');
    setCode('');
    setIssuedCode(null);
    setCodeError(null);
  };

  const handleGoogleOpenChange = (open: boolean) => {
    setGoogleOpen(open);
    if (!open) {
      setGoogleBusyId(null);
      setGoogleError(null);
    }
  };

  const handleGoogleSelect = async (userId: string) => {
    if (googleBusyId) return;

    setGoogleError(null);
    setGoogleBusyId(userId);
    const result = await signInWithGoogle(userId);

    if (!result.ok) {
      setGoogleBusyId(null);
      setGoogleError(getErrorMessage(result.error));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col justify-center py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Workout Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Учебный прототип тренировок
          </p>
        </header>

        <div role="note" className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-destructive">
            Учебный mock-вход. Не используйте настоящие пароли
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Это имитация: проверки выполняются в браузере, данные не защищены.
            Не вводите реальные email и пароли.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
              <Button
                type="button"
                size="sm"
                variant={method === 'password' ? 'default' : 'ghost'}
                aria-pressed={method === 'password'}
                disabled={isBusy}
                onClick={() => switchMethod('password')}
              >
                По паролю
              </Button>
              <Button
                type="button"
                size="sm"
                variant={method === 'code' ? 'default' : 'ghost'}
                aria-pressed={method === 'code'}
                disabled={isBusy}
                onClick={() => switchMethod('code')}
              >
                По коду
              </Button>
            </div>

            {method === 'password' ? (
              <form
                className="space-y-3"
                onSubmit={handlePasswordSubmit}
                autoComplete="off"
                noValidate
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="password-email"
                    className="text-sm font-medium"
                  >
                    Email
                  </label>
                  <Input
                    id="password-email"
                    type="email"
                    autoComplete="off"
                    placeholder="anna@example.test"
                    value={passwordEmail}
                    disabled={isPasswordChecking}
                    onChange={(event) => setPasswordEmail(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="password-value"
                    className="text-sm font-medium"
                  >
                    Пароль
                  </label>
                  <Input
                    id="password-value"
                    type="password"
                    autoComplete="off"
                    placeholder="Пароль демо-аккаунта"
                    value={password}
                    disabled={isPasswordChecking}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                {passwordError && (
                  <p role="alert" className="text-sm text-destructive">
                    {passwordError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPasswordChecking}
                >
                  {isPasswordChecking ? 'Проверка...' : 'Войти'}
                </Button>
              </form>
            ) : codeStep === 'email' ? (
              <form
                className="space-y-3"
                onSubmit={handleCodeRequest}
                autoComplete="off"
                noValidate
              >
                <div className="space-y-1.5">
                  <label htmlFor="code-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="code-email"
                    type="email"
                    autoComplete="off"
                    placeholder="anna@example.test"
                    value={codeEmail}
                    disabled={codeStatus !== 'idle'}
                    onChange={(event) => setCodeEmail(event.target.value)}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Письмо не отправляется. Учебный код появится на следующем
                  шаге.
                </p>

                {codeError && (
                  <p role="alert" className="text-sm text-destructive">
                    {codeError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={codeStatus !== 'idle'}
                >
                  {codeStatus === 'requesting'
                    ? 'Отправляем код...'
                    : 'Получить код'}
                </Button>
              </form>
            ) : (
              <form
                className="space-y-3"
                onSubmit={handleCodeSubmit}
                autoComplete="off"
                noValidate
              >
                <div className="space-y-1">
                  <div className="text-base font-medium">Введите код</div>
                  <p className="text-sm text-muted-foreground">
                    Код для {codeEmail.trim()}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Учебный код
                  </div>
                  <div className="mt-1 font-mono text-2xl tracking-widest text-primary">
                    {issuedCode}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Отправка письма имитируется — код показан прямо здесь.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="code-value" className="text-sm font-medium">
                    Код из 6 цифр
                  </label>
                  <Input
                    id="code-value"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={code}
                    disabled={codeStatus !== 'idle'}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                  />
                </div>

                {codeError && (
                  <p role="alert" className="text-sm text-destructive">
                    {codeError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={codeStatus !== 'idle'}
                >
                  {codeStatus === 'verifying' ? 'Проверка...' : 'Подтвердить'}
                </Button>

                <div className="flex flex-wrap items-center justify-between gap-1">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    disabled={codeStatus !== 'idle'}
                    onClick={() => void requestDemoCode(codeEmail)}
                  >
                    Получить код повторно
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    disabled={codeStatus !== 'idle'}
                    onClick={handleChangeEmail}
                  >
                    Изменить email
                  </Button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                или
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={isBusy}
                onClick={() => setGoogleOpen(true)}
              >
                <span className="flex size-5 items-center justify-center rounded-full border border-border text-xs font-semibold">
                  G
                </span>
                Войти через Google
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Имитация. Настоящий Google OAuth не подключён.
              </p>
            </div>
          </CardContent>
        </Card>

        <details className="rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Демонстрационные аккаунты
          </summary>
          <div className="mt-3 space-y-2">
            {DEMO_USERS.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {getDemoUserInitials(user.name)}
                </span>
                <div className="min-w-0 text-sm">
                  <div className="font-medium">{user.name}</div>
                  <div className="truncate text-muted-foreground">
                    {user.email}
                  </div>
                  <div className="text-muted-foreground">
                    Пароль:{' '}
                    <code className="font-mono text-foreground">
                      {user.password}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Аккаунты вымышленные. Код для входа по коду показывается на
            следующем шаге.
          </p>
        </details>

        <p className="text-center text-xs text-muted-foreground">
          Разделение пользователей работает только в этом учебном браузерном
          прототипе.
        </p>
      </div>

      <GoogleAccountDialog
        open={googleOpen}
        onOpenChange={handleGoogleOpenChange}
        onSelect={(userId) => void handleGoogleSelect(userId)}
        busyUserId={googleBusyId}
        error={googleError}
      />
    </div>
  );
}
