export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'provider_disabled'
  | 'network'
  | 'unknown';

export type AuthResult =
  | { ok: true }
  | { ok: false; error: AuthErrorCode };

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Неверный email или пароль.',
  email_not_confirmed:
    'Email не подтверждён. Подтвердите его по письму от Supabase.',
  rate_limited:
    'Слишком много попыток входа. Подождите и попробуйте снова.',
  provider_disabled: 'Вход по email отключён в настройках Supabase.',
  network: 'Нет связи с Supabase. Проверьте подключение.',
  unknown: 'Не удалось выполнить вход. Попробуйте ещё раз.',
};

export function getAuthErrorMessage(error?: AuthErrorCode): string {
  return error ? AUTH_ERROR_MESSAGES[error] : AUTH_ERROR_MESSAGES.unknown;
}

export function getSignOutErrorMessage(error?: AuthErrorCode): string {
  if (error === 'network') {
    return 'Не удалось выйти: нет связи с Supabase. Попробуйте снова.';
  }
  return 'Не удалось выйти. Попробуйте ещё раз.';
}

interface SupabaseAuthErrorLike {
  code?: string;
  name?: string;
  message?: string;
  status?: number;
}

/**
 * Ошибки Supabase Auth не показываются пользователю как есть:
 * UI работает только с кодами и своими сообщениями.
 */
export function mapAuthError(error: unknown): AuthErrorCode {
  if (!error || typeof error !== 'object') return 'unknown';

  const authError = error as SupabaseAuthErrorLike;
  const message = authError.message?.toLowerCase() ?? '';

  if (authError.code === 'invalid_credentials') return 'invalid_credentials';
  if (authError.code === 'invalid_grant') return 'invalid_credentials';
  if (authError.code === 'email_not_confirmed') return 'email_not_confirmed';
  if (
    authError.code === 'over_request_rate_limit' ||
    authError.code === 'over_email_send_rate_limit' ||
    authError.status === 429
  ) {
    return 'rate_limited';
  }
  if (
    authError.code === 'email_provider_disabled' ||
    authError.code === 'provider_disabled'
  ) {
    return 'provider_disabled';
  }
  if (
    authError.name === 'AuthRetryableFetchError' ||
    message.includes('failed to fetch') ||
    message.includes('network')
  ) {
    return 'network';
  }

  return 'unknown';
}
