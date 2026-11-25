// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '@/store';
import { supabase } from '@/store/supabase';
import { WORKOUT_COLUMNS, type WorkoutRow } from '@/store/workouts';
import type { OwnedWorkout } from '@/types';

vi.mock('@/store/supabase', () => ({
  supabase: { from: vi.fn() },
}));

interface QueryCall {
  method: string;
  args: unknown[];
}

function makeBuilder(result: { data: unknown; error: unknown }) {
  const calls: QueryCall[] = [];
  const builder = {} as Record<string, unknown>;

  for (const method of [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'returns',
  ]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }

  // PostgREST-билдер — thenable: await запускает запрос.
  builder.then = (onFulfilled: unknown, onRejected: unknown) =>
    Promise.resolve(result).then(
      onFulfilled as (value: unknown) => unknown,
      onRejected as (reason: unknown) => unknown
    );

  return { builder, calls };
}

const from = vi.mocked(supabase.from);

function useResult(result: { data: unknown; error: unknown }) {
  const query = makeBuilder(result);
  from.mockReturnValue(
    query.builder as unknown as ReturnType<typeof supabase.from>
  );
  return query;
}

function methods(calls: QueryCall[]): string[] {
  return calls.map((call) => call.method);
}

function callArgs(calls: QueryCall[], method: string): unknown[] {
  const call = calls.find((item) => item.method === method);
  if (!call) {
    throw new Error(`Метод ${method} не вызывался: ${methods(calls).join(', ')}`);
  }
  return call.args;
}

const row: WorkoutRow = {
  id: 'w-1',
  user_id: 'user-1',
  date: '2026-11-25',
  time: '18:30',
  results: [
    {
      exerciseKey: 'pullups',
      approaches: [
        { id: 'a1', reps: 8, hasExtraWeight: true, extraWeightKg: 5 },
      ],
    },
  ],
  comment: null,
  created_at: '2026-11-25T18:31:02.000Z',
};

const workout: OwnedWorkout = {
  id: 'w-1',
  userId: 'user-1',
  date: '2026-11-25',
  time: '18:30',
  results: row.results,
};

const expectedWorkout = {
  id: 'w-1',
  userId: 'user-1',
  date: '2026-11-25',
  time: '18:30',
  results: row.results,
  comment: undefined,
  createdAt: '2026-11-25T18:31:02.000Z',
};

beforeEach(() => {
  from.mockReset();
});

describe('store.getAll', () => {
  it('читает только свои строки и сортирует на сервере', async () => {
    const query = useResult({ data: [row], error: null });

    const result = await store.getAll('user-1');

    expect(result).toEqual({ ok: true, data: [expectedWorkout] });
    expect(callArgs(query.calls, 'select')).toEqual([WORKOUT_COLUMNS]);
    expect(callArgs(query.calls, 'eq')).toEqual(['user_id', 'user-1']);
    const orders = query.calls
      .filter((call) => call.method === 'order')
      .map((call) => call.args);
    expect(orders).toEqual([
      ['date', { ascending: false }],
      ['time', { ascending: false }],
    ]);
    expect(methods(query.calls)).toEqual([
      'select',
      'eq',
      'order',
      'order',
      'returns',
    ]);
  });

  it('пустой ответ превращает в пустой массив', async () => {
    useResult({ data: null, error: null });

    expect(await store.getAll('user-1')).toEqual({ ok: true, data: [] });
  });

  it('код ошибки Supabase возвращает вызывающему', async () => {
    useResult({ data: null, error: { code: '42501' } });

    expect(await store.getAll('user-1')).toEqual({
      ok: false,
      error: 'forbidden',
    });
  });

  it('без userId не обращается к Supabase', async () => {
    expect(await store.getAll('')).toEqual({
      ok: false,
      error: 'not_authenticated',
    });
    expect(from).not.toHaveBeenCalled();
  });
});

describe('store.getLast', () => {
  it('берёт одну последнюю тренировку', async () => {
    const query = useResult({ data: row, error: null });

    expect(await store.getLast('user-1')).toEqual({
      ok: true,
      data: expectedWorkout,
    });
    expect(callArgs(query.calls, 'limit')).toEqual([1]);
    expect(methods(query.calls)).toContain('maybeSingle');
  });

  it('возвращает null, если тренировок нет', async () => {
    useResult({ data: null, error: null });

    expect(await store.getLast('user-1')).toEqual({ ok: true, data: null });
  });

  it('пробрасывает код ошибки', async () => {
    useResult({ data: null, error: { name: 'AbortError' } });

    expect(await store.getLast('user-1')).toEqual({
      ok: false,
      error: 'timeout',
    });
  });
});

describe('store.add', () => {
  it('вставляет тренировку с user_id и возвращает доменный объект', async () => {
    const query = useResult({ data: row, error: null });

    const result = await store.add({ ...workout, comment: undefined });

    expect(result).toEqual({ ok: true, data: expectedWorkout });
    expect(callArgs(query.calls, 'insert')).toEqual([
      {
        id: 'w-1',
        user_id: 'user-1',
        date: '2026-11-25',
        time: '18:30',
        results: row.results,
        comment: null,
      },
    ]);
    expect(methods(query.calls)).toEqual([
      'insert',
      'select',
      'single',
      'returns',
    ]);
  });

  it('без владельца не делает вставку', async () => {
    expect(await store.add({ ...workout, userId: '' })).toEqual({
      ok: false,
      error: 'not_authenticated',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('конфликт ID возвращает duplicate_id', async () => {
    useResult({ data: null, error: { code: '23505' } });

    expect(await store.add(workout)).toEqual({
      ok: false,
      error: 'duplicate_id',
    });
  });

  it('исключение клиента не вылетает наружу', async () => {
    from.mockImplementation(() => {
      throw new Error('network fail');
    });

    expect(await store.add(workout)).toEqual({
      ok: false,
      error: 'network',
    });
  });

  it('при ошибке не пишет в localStorage и не трогает старые данные', async () => {
    const legacy = JSON.stringify([{ id: 'legacy' }]);
    localStorage.setItem('workout-tracker-data', legacy);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    useResult({ data: null, error: { code: '42501' } });

    await store.add(workout);

    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem('workout-tracker-data')).toBe(legacy);
  });
});

describe('store.update', () => {
  it('обновляет по id без смены владельца', async () => {
    const query = useResult({ data: row, error: null });

    const result = await store.update({ ...workout, comment: 'правка' });

    expect(result).toEqual({ ok: true, data: expectedWorkout });
    expect(callArgs(query.calls, 'update')).toEqual([
      {
        date: '2026-11-25',
        time: '18:30',
        results: row.results,
        comment: 'правка',
      },
    ]);
    expect(callArgs(query.calls, 'eq')).toEqual(['id', 'w-1']);
  });

  it('без строки возвращает not_found', async () => {
    useResult({ data: null, error: null });

    expect(await store.update(workout)).toEqual({
      ok: false,
      error: 'not_found',
    });
  });
});

describe('store.remove', () => {
  it('удаляет по id и подтверждает удаление', async () => {
    const query = useResult({ data: { id: 'w-1' }, error: null });

    expect(await store.remove('w-1')).toEqual({ ok: true, data: undefined });
    expect(callArgs(query.calls, 'eq')).toEqual(['id', 'w-1']);
    expect(callArgs(query.calls, 'select')).toEqual(['id']);
    expect(methods(query.calls)).toEqual([
      'delete',
      'eq',
      'select',
      'maybeSingle',
    ]);
  });

  it('чужую или уже удалённую строку показывает как not_found', async () => {
    useResult({ data: null, error: null });

    expect(await store.remove('w-1')).toEqual({
      ok: false,
      error: 'not_found',
    });
  });
});
