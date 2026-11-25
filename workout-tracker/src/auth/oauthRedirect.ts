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
 * Адрес возврата для OAuth и восстановления пароля.
 *
 * На GitHub Pages приложение живёт в подкаталоге (`https://<user>.github.io/<repo>/`),
 * поэтому одного `origin` мало: Supabase вернул бы пользователя на корень домена,
 * где лежит чужой сайт или 404. `BASE_URL` совпадает с `base` из vite.config.ts.
 */
export function getAuthRedirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
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
 * Убирает OAuth-параметры из URL, сохраняя маршрут и посторонние параметры.
 * Supabase успевает прочитать параметры при создании клиента, поэтому
 * очистка безопасна и не мешает восстановлению сессии.
 *
 * Приложение использует HashRouter: маршрут живёт в hash. Поэтому после
 * удаления токенов hash не может остаться пустым — иначе роутер остался бы
 * на несуществующем маршруте. Пустой hash заменяется на `#/`, а роутер
 * получает уведомление событием `hashchange` (`replaceState` его не шлёт).
 */
export function clearAuthRedirectParams(): void {
  if (!hasAuthRedirectParams()) return;

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
  url.hash = hashString ? `#${hashString}` : '#/';

  window.history.replaceState(window.history.state, '', url.toString());
  window.dispatchEvent(new Event('hashchange'));
}
