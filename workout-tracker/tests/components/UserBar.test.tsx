// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import UserBar from '@/components/UserBar';
import type { AuthUser } from '@/auth/user';
import type { AuthResult } from '@/auth/errors';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const user: AuthUser = {
  id: 'u-1',
  email: 'anna@example.com',
  displayName: 'Анна',
};

let onSignOut: Mock<() => Promise<AuthResult>>;

beforeEach(() => {
  onSignOut = vi.fn<() => Promise<AuthResult>>().mockResolvedValue({ ok: true });
});

describe('UserBar', () => {
  it('показывает имя, email и инициал', () => {
    render(<UserBar user={user} onSignOut={onSignOut} />);

    expect(screen.getByText('Анна')).toBeInTheDocument();
    expect(screen.getByText('anna@example.com')).toBeInTheDocument();
    expect(screen.getByText('А')).toBeInTheDocument();
  });

  it('двойной клик не отправляет выход дважды', async () => {
    const pending = deferred<{ ok: false; error: 'network' }>();
    onSignOut.mockReturnValue(pending.promise);
    render(<UserBar user={user} onSignOut={onSignOut} />);

    const button = screen.getByRole('button', { name: 'Выйти' });
    act(() => {
      button.click();
      button.click();
    });

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Выход...' })).toBeDisabled();

    await act(async () => {
      pending.resolve({ ok: false, error: 'network' });
      await pending.promise;
    });
  });

  it('ошибка сети показывается inline, пользователь остаётся', async () => {
    onSignOut.mockResolvedValue({ ok: false, error: 'network' });
    render(<UserBar user={user} onSignOut={onSignOut} />);

    screen.getByRole('button', { name: 'Выйти' }).click();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось выйти: нет связи с Supabase. Попробуйте снова.'
    );
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeEnabled();
    expect(screen.getByText('Анна')).toBeInTheDocument();
  });

  it('неизвестная ошибка выхода имеет общий текст', async () => {
    onSignOut.mockRejectedValue(new Error('boom'));
    render(<UserBar user={user} onSignOut={onSignOut} />);

    screen.getByRole('button', { name: 'Выйти' }).click();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось выйти. Попробуйте ещё раз.'
    );
  });
});
