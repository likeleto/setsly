// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeMock = vi.hoisted(() => ({ add: vi.fn() }));

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

import InputScreen from '@/pages/InputScreen';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderScreen(path = '/workout/pullups') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/workout/:exerciseKey" element={<InputScreen />} />
        <Route path="/" element={<div>main screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function repsInput() {
  return screen.getByPlaceholderText('Повт.');
}

function saveButton(name = 'Сохранить тренировку') {
  return screen.getByRole('button', { name });
}

beforeEach(() => {
  window.confirm = vi.fn();
  storeMock.add.mockResolvedValue({ ok: true, data: {} });
});

describe('сохранение тренировки', () => {
  it('отправляет владельца, упражнение и введённые подходы', async () => {
    renderScreen();
    fireEvent.change(repsInput(), { target: { value: '8' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(storeMock.add).toHaveBeenCalledTimes(1));

    const workout = storeMock.add.mock.calls[0][0];
    expect(workout.userId).toBe('user-1');
    expect(workout.id).toBeTruthy();
    expect(workout.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(workout.time).toMatch(/^\d{2}:\d{2}$/);
    expect(workout.results).toHaveLength(1);
    expect(workout.results[0].exerciseKey).toBe('pullups');
    expect(workout.results[0].approaches).toHaveLength(1);
    expect(workout.results[0].approaches[0]).toMatchObject({
      reps: 8,
      hasExtraWeight: false,
      extraWeightKg: 0,
    });
  });

  it('двойной клик сохраняет ровно одну тренировку', async () => {
    const pending = deferred<{ ok: true; data: unknown }>();
    storeMock.add.mockReturnValue(pending.promise);
    renderScreen();

    const button = saveButton();
    act(() => {
      button.click();
      button.click();
    });

    expect(storeMock.add).toHaveBeenCalledTimes(1);
    expect(saveButton('Сохранение...')).toBeDisabled();
    expect(saveButton('Сохранение...')).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      pending.resolve({ ok: true, data: {} });
      await pending.promise;
    });

    await screen.findByText('main screen');
  });

  it('при ошибке показывает inline-сообщение и не стирает подходы', async () => {
    const pending = deferred<{ ok: false; error: 'network' }>();
    storeMock.add.mockReturnValue(pending.promise);
    renderScreen();
    fireEvent.change(repsInput(), { target: { value: '8' } });
    fireEvent.click(saveButton());

    await act(async () => {
      pending.resolve({ ok: false, error: 'network' });
      await pending.promise;
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Не удалось сохранить: нет связи с Supabase. Проверьте подключение.'
    );
    expect(repsInput()).toHaveValue(8);
    expect(screen.queryByText('main screen')).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it('после ошибки повторная попытка снова вызывает store', async () => {
    storeMock.add
      .mockResolvedValueOnce({ ok: false, error: 'network' })
      .mockResolvedValueOnce({ ok: true, data: {} });
    renderScreen();

    fireEvent.click(saveButton());
    await screen.findByRole('alert');

    fireEvent.click(saveButton());
    await screen.findByText('main screen');

    expect(storeMock.add).toHaveBeenCalledTimes(2);
  });

  it('не отправляет подход без повторений', async () => {
    renderScreen();
    fireEvent.change(repsInput(), { target: { value: '0' } });

    fireEvent.click(saveButton());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Введите количество повторений'
    );
    expect(storeMock.add).not.toHaveBeenCalled();
  });
});

describe('навигация и отмена', () => {
  it('неизвестное упражнение возвращает на главную', async () => {
    renderScreen('/workout/unknown');

    await screen.findByText('main screen');
  });

  it('отмена с введёнными данными спрашивает подтверждение inline', () => {
    renderScreen();
    fireEvent.change(repsInput(), { target: { value: '8' } });

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.getByText('Отменить ввод?')).toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Продолжить ввод' }));
    expect(screen.queryByText('Отменить ввод?')).not.toBeInTheDocument();
  });

  it('пустая отмена сразу уходит на главную', async () => {
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    await screen.findByText('main screen');
  });
});
