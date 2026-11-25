// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAuthRedirectParams,
  hasAuthRedirectParams,
  readOAuthRedirectError,
} from '@/auth/oauthRedirect';

function setUrl(url: string, state: Record<string, unknown> = {}) {
  window.history.replaceState(state, '', url);
}

beforeEach(() => {
  setUrl('/');
});

describe('readOAuthRedirectError', () => {
  it('без параметров редиректа возвращает null', () => {
    expect(readOAuthRedirectError()).toBeNull();
  });

  it('успешный PKCE-редирект с code не считается ошибкой', () => {
    setUrl('/?code=abc123');

    expect(readOAuthRedirectError()).toBeNull();
  });

  it('отмену Google в hash и в query показывает как oauth_cancelled', () => {
    setUrl('/#error=access_denied');
    expect(readOAuthRedirectError()).toBe('oauth_cancelled');

    setUrl('/?error_code=access_denied');
    expect(readOAuthRedirectError()).toBe('oauth_cancelled');
  });

  it('прочие ошибки Google показывает как oauth_failed', () => {
    setUrl('/#error=server_error');
    expect(readOAuthRedirectError()).toBe('oauth_failed');

    setUrl('/?error=invalid_request');
    expect(readOAuthRedirectError()).toBe('oauth_failed');
  });
});

describe('hasAuthRedirectParams', () => {
  it('видит токены, code и ошибки', () => {
    setUrl('/#access_token=token&refresh_token=refresh');
    expect(hasAuthRedirectParams()).toBe(true);

    setUrl('/?code=abc123');
    expect(hasAuthRedirectParams()).toBe(true);

    setUrl('/?error=access_denied');
    expect(hasAuthRedirectParams()).toBe(true);
  });

  it('не реагирует на обычные параметры приложения', () => {
    setUrl('/?next=1#section');

    expect(hasAuthRedirectParams()).toBe(false);
  });
});

describe('clearAuthRedirectParams', () => {
  it('удаляет токены из hash, сохраняя путь и посторонние параметры', () => {
    setUrl(
      '/history?next=1&code=abc123#foo=bar&access_token=token&refresh_token=refresh&expires_in=3600&token_type=bearer&provider_token=p&provider_refresh_token=pr&expires_at=1&sb_flow_id=flow&state=xyz'
    );

    clearAuthRedirectParams();

    expect(window.location.pathname).toBe('/history');
    expect(window.location.search).toBe('?next=1');
    expect(window.location.hash).toBe('#foo=bar');
    expect(hasAuthRedirectParams()).toBe(false);
  });

  it('убирает ошибку из query, чтобы она не пережила F5', () => {
    setUrl('/?error=access_denied&error_code=access_denied&error_description=nope');

    clearAuthRedirectParams();

    expect(window.location.search).toBe('');
    expect(readOAuthRedirectError()).toBeNull();
  });

  it('сохраняет history.state', () => {
    setUrl('/?code=abc123', { from: 'google' });

    clearAuthRedirectParams();

    expect(window.history.state).toEqual({ from: 'google' });
  });

  it('повторный вызов ничего не ломает', () => {
    setUrl('/?code=abc123#access_token=token');

    clearAuthRedirectParams();
    const first = window.location.href;
    clearAuthRedirectParams();

    expect(window.location.href).toBe(first);
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#/');
  });

  it('после hash-редиректа оставляет роутеру маршрут «/»', () => {
    setUrl(
      '/#access_token=token&refresh_token=refresh&expires_in=3600&token_type=bearer'
    );

    clearAuthRedirectParams();

    expect(window.location.hash).toBe('#/');
    expect(window.location.search).toBe('');
    expect(readOAuthRedirectError()).toBeNull();
  });

  it('без auth-параметров адрес не меняется', () => {
    setUrl('/#/history');

    clearAuthRedirectParams();

    expect(window.location.hash).toBe('#/history');
  });
});
