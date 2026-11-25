import { describe, expect, it } from 'vitest';
import {
  getAuthErrorMessage,
  getSignOutErrorMessage,
  mapAuthError,
  mapOAuthError,
  type AuthErrorCode,
} from '@/auth/errors';

const CODES: AuthErrorCode[] = [
  'invalid_credentials',
  'email_not_confirmed',
  'rate_limited',
  'provider_disabled',
  'oauth_cancelled',
  'oauth_failed',
  'sign_up_exists',
  'sign_up_failed',
  'reset_password_failed',
  'network',
  'unknown',
];

describe('mapAuthError', () => {
  it.each([
    [{ code: 'invalid_credentials' }, 'invalid_credentials'],
    [{ code: 'invalid_grant' }, 'invalid_credentials'],
    [{ code: 'email_not_confirmed' }, 'email_not_confirmed'],
    [{ code: 'over_request_rate_limit' }, 'rate_limited'],
    [{ code: 'over_email_send_rate_limit' }, 'rate_limited'],
    [{ status: 429 }, 'rate_limited'],
    [{ code: 'email_provider_disabled' }, 'provider_disabled'],
    [{ code: 'provider_disabled' }, 'provider_disabled'],
    [{ code: 'access_denied' }, 'oauth_cancelled'],
    [{ code: 'user_already_exists' }, 'sign_up_exists'],
    [{ code: 'invalid_api_key' }, 'sign_up_failed'],
    [{ code: 'bad_json' }, 'sign_up_failed'],
    [{ code: 'mailer_fallback' }, 'reset_password_failed'],
    [{ code: 'invalid_redirect_to' }, 'reset_password_failed'],
    [{ name: 'AuthRetryableFetchError' }, 'network'],
    [{ message: 'Failed to fetch' }, 'network'],
    [{ message: 'network error' }, 'network'],
    [{ message: 'unexpected' }, 'unknown'],
    [{}, 'unknown'],
    [null, 'unknown'],
    [undefined, 'unknown'],
  ] as const)('ошибка %j → %s', (error, expected) => {
    expect(mapAuthError(error)).toBe(expected);
  });
});

describe('mapOAuthError', () => {
  it('сохраняет сеть, лимит и отмену', () => {
    expect(mapOAuthError({ name: 'AuthRetryableFetchError' })).toBe('network');
    expect(mapOAuthError({ status: 429 })).toBe('rate_limited');
    expect(mapOAuthError({ code: 'access_denied' })).toBe('oauth_cancelled');
  });

  it('ошибку пароля не показывает как ошибку пароля после Google', () => {
    expect(mapOAuthError({ code: 'invalid_credentials' })).toBe('oauth_failed');
    expect(mapOAuthError({ code: 'email_not_confirmed' })).toBe('oauth_failed');
    expect(mapOAuthError(new Error('boom'))).toBe('oauth_failed');
  });
});

describe('getAuthErrorMessage', () => {
  it('для каждого кода есть текст', () => {
    for (const code of CODES) {
      expect(getAuthErrorMessage(code).length).toBeGreaterThan(0);
    }
  });

  it('без кода возвращает общий текст', () => {
    expect(getAuthErrorMessage()).toBe(
      'Не удалось выполнить вход. Попробуйте ещё раз.'
    );
  });

  it('не выводит сырой текст ошибки Supabase', () => {
    const rawMessage = 'invalid login credentials: password=secret';
    const message = getAuthErrorMessage(mapAuthError({ message: rawMessage }));

    expect(message).not.toContain('password');
    expect(message).not.toContain('invalid login credentials');
  });

  it('у выхода отдельный текст для сети', () => {
    expect(getSignOutErrorMessage('network')).toBe(
      'Не удалось выйти: нет связи с Supabase. Попробуйте снова.'
    );
    expect(getSignOutErrorMessage('unknown')).toBe(
      'Не удалось выйти. Попробуйте ещё раз.'
    );
  });
});
