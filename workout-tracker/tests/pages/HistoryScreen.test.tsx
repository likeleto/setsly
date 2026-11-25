// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeMock = vi.hoisted(() => ({
  getAll: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/store', async () => {
  const errors = await import('@/store/errors');
  return {
    store: storeMock,
    getWorkoutErrorMessage: errors.getWorkoutErrorMessage,
  };
});

const authState = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'anna@example.com', displayName: 'Анна' },
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}));

import HistoryScreen from '@/pages/HistoryScreen';
import type { Workout } from '@/types';

function workout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'w-1',
    userId: 'user-1',
    date: '2026-11-24',
    time: '10:00',
    results: [
      {
        exerciseKey: 'pullups',
        approaches: [
          { id: 'a1', reps: 8, hasExtraWeight: true, extraWeightKg: 5 },
        ],
      },
    ],
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/history']}>
      <Routes>
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/" element={<div>main screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function renderWithWorkouts(workouts: Workout[]) {
  storeMock.getAll.mockResolvedValue({ ok: true, data: workouts });
  renderScreen();
  await screen.findByText(workouts[0].time);
}

async function openDeleteConfirm(time = '10:00') {
  fireEvent.click(screen.getByText(time));
  fireEvent.click(screen.getByRole('button', { name: 'Удалить тренировку' }));
  return screen.getByRole('button', { name: 'Да, удалить' });
}

beforeEach(() => {
  storeMock.getAll.mockResolvedValue({ ok: true, data: [] });
  storeMock.remove.mockResolvedValue({ ok: true, data: undefined });
});

describe('загрузка истории', () => {
  it('показывает состояние загрузки до ответа', () => {
    const pending = deferred<{ ok: true; data: Workout[] }>();
    storeMock.getAll.mockReturnValue(pending.promise);

    renderScreen();

    expect(screen.getByRole('status')).toHaveTextContent('Загрузка истории...');
  });

  it('после успешной загрузки показывает тренировки', async () => {
    await renderWithWorkouts([workout()]);

    expect(screen.getByText('24 ноября 2026 г.')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('ошибка загрузки показывает inline-сообщение и кнопку повтора', async () => {
    storeMock.getAll
      .mockResolvedValueOnce({ ok: false, error: 'network' })
      .mockResolvedValueOnce({ ok: true, data: [workout()] });
    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Нет связи с Supabase. Проверьте подключение.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('10:00')).toBeInTheDocument();
    expect(storeMock.getAll).toHaveBeenCalledTimes(2);
  });

  it('пустое состояние показывает только после успешной загрузки', async () => {
    const pending = deferred<{ ok: true; data: Workout[] }>();
    storeMock.getAll.mockReturnValue(pending.promise);
    renderScreen();

    expect(screen.queryByText('Записей пока нет')).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve({ ok: true, data: [] });
      await pending.promise;
    });

    expect(screen.getByText('Записей пока нет')).toBeInTheDocument();
  });

  it('сортирует тренировки от новых к старым', async () => {
    await renderWithWorkouts([
      workout({ id: 'early', time: '10:00' }),
      workout({ id: 'late', time: '18:30' }),
    ]);

    expect(
      screen.getAllByText(/^\d{2}:\d{2}$/).map((node) => node.textContent)
    ).toEqual(['18:30', '10:00']);
  });
});

describe('удаление тренировки', () => {
  it('двойной клик отправляет один запрос и блокирует кнопку', async () => {
    const pending = deferred<{ ok: true; data: undefined }>();
    storeMock.remove.mockReturnValue(pending.promise);
    await renderWithWorkouts([workout()]);
    const confirm = await openDeleteConfirm();

    act(() => {
      confirm.click();
      confirm.click();
    });

    expect(storeMock.remove).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Удаление...' })
    ).toBeDisabled();

    await act(async () => {
      pending.resolve({ ok: true, data: undefined });
      await pending.promise;
    });

    await waitFor(() =>
      expect(screen.getByText('Записей пока нет')).toBeInTheDocument()
    );
  });

  it('при ошибке строка остаётся, а текст ошибки inline', async () => {
    storeMock.remove.mockResolvedValue({ ok: false, error: 'network' });
    await renderWithWorkouts([workout()]);
    await openDeleteConfirm();

    fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось удалить: нет связи с Supabase. Проверьте подключение.'
    );
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.queryByText('Записей пока нет')).not.toBeInTheDocument();
  });

  it('not_found перезагружает список', async () => {
    storeMock.getAll
      .mockResolvedValueOnce({ ok: true, data: [workout()] })
      .mockResolvedValueOnce({ ok: true, data: [] });
    storeMock.remove.mockResolvedValue({ ok: false, error: 'not_found' });
    renderScreen();
    await screen.findByText('10:00');
    await openDeleteConfirm();

    fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }));

    expect(await screen.findByText('Записей пока нет')).toBeInTheDocument();
    expect(storeMock.getAll).toHaveBeenCalledTimes(2);
  });
});
