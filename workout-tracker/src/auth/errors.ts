export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'provider_disabled'
  | 'oauth_cancelled'
  | 'oauth_failed'
  | 'sign_up_exists'
  | 'sign_up_failed'
  | 'reset_password_failed'
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
  oauth_cancelled: 'Вход через Google отменён.',
  oauth_failed:
    'Не удалось войти через Google. Попробуйте ещё раз или войдите по email.',
  sign_up_exists:
    'Пользователь с таким email уже существует. Войдите или восстановите пароль.',
  sign_up_failed:
    'Регистрация не удалась. Проверьте email и пароль.',
  reset_password_failed:
    'Не удалось отправить письмо. Попробуйте снова.',
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
  if (authError.code === 'access_denied') return 'oauth_cancelled';
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
  if (authError.code === 'user_already_exists') return 'sign_up_exists';
  if (
    authError.code === 'invalid_api_key' ||
    authError.code === 'bad_json'
  ) {
    return 'sign_up_failed';
  }
  if (authError.code === 'mailer_fallback') return 'reset_password_failed';
  if (authError.code === 'invalid_redirect_to') return 'reset_password_failed';
  if (
    authError.name === 'AuthRetryableFetchError' ||
    message.includes('failed to fetch') ||
    message.includes('network')
  ) {
    return 'network';
  }

  return 'unknown';
}

/**
 * Ошибки запуска Google-входа: всё, что не сеть, отмена или лимит,
 * показываем как общий сбой OAuth, а не как ошибку пароля.
 */
export function mapOAuthError(error: unknown): AuthErrorCode {
  const code = mapAuthError(error);

  if (
    code === 'network' ||
    code === 'rate_limited' ||
    code === 'oauth_cancelled'
  ) {
    return code;
  }

  return 'oauth_failed';
}
