import type { AuthErrorCode } from '@/auth/errors';

/**
 * Параметры, которые Supabase Auth добавляет к URL после OAuth-редиректа.
 * Их нужно прочитать один раз и убрать из адресной строки: токены не должны
 * оставаться в истории браузера, а сообщение об ошибке — переживать F5.
 */
const AUTH_REDIRECT_KEYS = [
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'provider_token',
  'provider_refresh_token',
  'code',
  'error',
  'error_code',
  'error_description',
  'state',
  'sb_flow_id',
];

function getHashParams(): URLSearchParams {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  return new URLSearchParams(hash);
}

/**
 * Ошибка, с которой Google или Supabase вернули пользователя.
 * Возвращает null, если редирект был успешным или его не было.
 */
export function readOAuthRedirectError(): AuthErrorCode | null {
  const hash = getHashParams();
  const search = new URLSearchParams(window.location.search);

  const error = hash.get('error') ?? search.get('error');
  const errorCode = hash.get('error_code') ?? search.get('error_code');

  if (!error && !errorCode) return null;
  if (error === 'access_denied' || errorCode === 'access_denied') {
    return 'oauth_cancelled';
  }
  return 'oauth_failed';
}

export function hasAuthRedirectParams(): boolean {
  const hash = getHashParams();
  const search = new URLSearchParams(window.location.search);

  return AUTH_REDIRECT_KEYS.some(
    (key) => hash.has(key) || search.has(key)
  );
}

/**
 * Убирает OAuth-параметры из URL, сохраняя путь и остальные query/hash.
 * Supabase успевает прочитать параметры при создании клиента, поэтому
 * очистка безопасна и не мешает восстановлению сессии.
 */
export function clearAuthRedirectParams(): void {
  const url = new URL(window.location.href);
  const search = new URLSearchParams(url.search);
  const hash = getHashParams();

  for (const key of AUTH_REDIRECT_KEYS) {
    search.delete(key);
    hash.delete(key);
  }

  const searchString = search.toString();
  const hashString = hash.toString();

  url.search = searchString ? `?${searchString}` : '';
  url.hash = hashString ? `#${hashString}` : '';

  window.history.replaceState(window.history.state, '', url.toString());
}
