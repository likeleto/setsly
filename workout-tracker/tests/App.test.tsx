// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  status: 'restoring' as 'restoring' | 'signedOut' | 'signedIn',
  user: null as null | {
    id: string;
    email: string;
    displayName: string;
  },
  api: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    signInWithGoogle: vi.fn(),
    oauthError: null,
    clearOAuthError: vi.fn(),
    resetSent: false,
    clearResetSent: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    status: authState.status,
    user: authState.user,
    ...authState.api,
  }),
}));

const storeMock = vi.hoisted(() => ({
  getLast: vi.fn(),
  getAll: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/store', async () => {
  const errors = await import('@/store/errors');
  return {
    store: storeMock,
    getWorkoutErrorMessage: errors.getWorkoutErrorMessage,
  };
});

import App from '@/App';

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

beforeEach(() => {
  authState.status = 'restoring';
  authState.user = null;
  authState.api.signOut.mockResolvedValue({ ok: true });
  storeMock.getLast.mockResolvedValue({ ok: true, data: null });
  storeMock.getAll.mockResolvedValue({ ok: true, data: [] });
});

describe('экран по состоянию сессии', () => {
  it('пока сессия восстанавливается, не показывает форму входа', () => {
    renderApp();

    expect(screen.getByRole('status')).toHaveTextContent('Проверяем сессию...');
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('без сессии показывает вход', () => {
    authState.status = 'signedOut';
    renderApp();

    expect(
      screen.getByRole('button', { name: 'Войти через Google' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Workout Tracker')).toBeInTheDocument();
  });

  it('с сессией показывает пользователя и упражнения', async () => {
    authState.status = 'signedIn';
    authState.user = {
      id: 'u-1',
      email: 'anna@example.com',
      displayName: 'Анна',
    };
    renderApp();

    expect(screen.getByText('Анна')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument();
    expect(screen.getByText('Подтягивания')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'История' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });
});
