// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  api: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    signInWithGoogle: vi.fn(),
    oauthError: null as string | null,
    clearOAuthError: vi.fn(),
    resetSent: false,
    setResetSent: vi.fn(),
    clearResetSent: vi.fn(),
  },
}));

vi.mock('@/auth/AuthContext', () => ({ useAuth: () => authState.api }));

import AuthScreen from '@/components/AuthScreen';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function submitForm(container: HTMLElement) {
  fireEvent.submit(container.querySelector('form')!);
}

function fillLogin(email = 'anna@example.com', password = 'secret') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: password } });
}

beforeEach(() => {
  authState.api.oauthError = null;
  authState.api.signInWithPassword.mockResolvedValue({ ok: true });
  authState.api.signInWithGoogle.mockResolvedValue({ ok: true });
  authState.api.signUp.mockResolvedValue({ ok: true });
  authState.api.resetPassword.mockResolvedValue({ ok: true });
});

describe('вход по email и паролю', () => {
  it('пустая форма не отправляет запрос', () => {
    const { container } = render(<AuthScreen />);

    submitForm(container);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Введите email и пароль.'
    );
    expect(authState.api.signInWithPassword).not.toHaveBeenCalled();
  });

  it('во время запроса блокирует кнопку и не отправляет второй раз', async () => {
    const pending = deferred<{ ok: false; error: 'invalid_credentials' }>();
    authState.api.signInWithPassword.mockReturnValue(pending.promise);
    const { container } = render(<AuthScreen />);
    fillLogin();

    submitForm(container);
    submitForm(container);

    expect(authState.api.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Вход...' })).toBeDisabled();

    await act(async () => {
      pending.resolve({ ok: false, error: 'invalid_credentials' });
      await pending.promise;
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Неверный email или пароль.'
    );
  });

  it('показывает коды ошибок Supabase своими текстами', async () => {
    authState.api.signInWithPassword.mockResolvedValue({
      ok: false,
      error: 'email_not_confirmed',
    });
    const { container } = render(<AuthScreen />);
    fillLogin();

    submitForm(container);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email не подтверждён. Подтвердите его по письму от Supabase.'
    );
  });

  it('передаёт email без лишних пробелов', async () => {
    const { container } = render(<AuthScreen />);
    fillLogin('  anna@example.com  ', 'secret');

    submitForm(container);

    expect(authState.api.signInWithPassword).toHaveBeenCalledWith(
      'anna@example.com',
      'secret'
    );
  });
});

describe('вход через Google', () => {
  it('блокирует кнопку и не запускает вход дважды', async () => {
    const pending = deferred<{ ok: false; error: 'oauth_failed' }>();
    authState.api.signInWithGoogle.mockReturnValue(pending.promise);
    render(<AuthScreen />);

    const button = screen.getByRole('button', { name: 'Войти через Google' });
    act(() => {
      button.click();
      button.click();
    });

    expect(authState.api.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Переходим в Google...' })
    ).toBeDisabled();
    expect(authState.api.signInWithGoogle).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ ok: false, error: 'oauth_failed' });
      await pending.promise;
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Не удалось войти через Google. Попробуйте ещё раз или войдите по email.'
    );
  });

  it('показывает ошибку OAuth из сессии', () => {
    authState.api.oauthError = 'oauth_cancelled';
    render(<AuthScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Вход через Google отменён.'
    );
  });
});

describe('регистрация', () => {
  it('проверяет совпадение и длину пароля до запроса', () => {
    const { container } = render(<AuthScreen />);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Зарегистрироваться' })[0]
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'anna@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'secret1' },
    });
    fireEvent.change(screen.getByLabelText('Подтверждение пароля'), {
      target: { value: 'secret2' },
    });

    submitForm(container);
    expect(screen.getByRole('alert')).toHaveTextContent('Пароли не совпадают.');

    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText('Подтверждение пароля'), {
      target: { value: '123' },
    });

    submitForm(container);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Пароль должен быть не менее 6 символов.'
    );
    expect(authState.api.signUp).not.toHaveBeenCalled();
  });

  it('передаёт имя в signUp', async () => {
    const { container } = render(<AuthScreen />);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Зарегистрироваться' })[0]
    );

    fireEvent.change(screen.getByLabelText(/Имя/), {
      target: { value: 'Анна' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'anna@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'secret1' },
    });
    fireEvent.change(screen.getByLabelText('Подтверждение пароля'), {
      target: { value: 'secret1' },
    });

    submitForm(container);

    expect(authState.api.signUp).toHaveBeenCalledWith(
      'anna@example.com',
      'secret1',
      'Анна'
    );
  });
});

describe('восстановление пароля', () => {
  it('без email не отправляет письмо', () => {
    render(<AuthScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Забыли пароль?' }));

    fireEvent.click(screen.getByRole('button', { name: 'Отправить ссылку' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Введите email.');
    expect(authState.api.resetPassword).not.toHaveBeenCalled();
  });
});
