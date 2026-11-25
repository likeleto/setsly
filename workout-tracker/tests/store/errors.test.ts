import { describe, expect, it } from 'vitest';
import {
  getWorkoutErrorMessage,
  mapWorkoutError,
  type WorkoutErrorAction,
  type WorkoutErrorCode,
} from '@/store/errors';

const ACTIONS: WorkoutErrorAction[] = ['load', 'save', 'delete'];

const CODES: WorkoutErrorCode[] = [
  'not_authenticated',
  'forbidden',
  'network',
  'timeout',
  'duplicate_id',
  'check_violation',
  'not_found',
  'unknown',
];

describe('mapWorkoutError', () => {
  it.each([
    [{ code: '23505' }, 'duplicate_id'],
    [{ code: '23514' }, 'check_violation'],
    [{ code: '42501' }, 'forbidden'],
    [{ code: 'PGRST301' }, 'not_authenticated'],
    [{ status: 401 }, 'not_authenticated'],
    [{ message: 'JWT expired' }, 'not_authenticated'],
    [{ message: 'session_not_found' }, 'not_authenticated'],
    [{ code: 'PGRST116' }, 'not_found'],
    [{ name: 'AbortError' }, 'timeout'],
    [{ message: 'The operation was aborted' }, 'timeout'],
    [{ name: 'TypeError', message: 'Failed to fetch' }, 'network'],
    [{ message: 'network error' }, 'network'],
    [{ code: 'XX000', message: 'something else' }, 'unknown'],
    [{}, 'unknown'],
    [null, 'unknown'],
    [undefined, 'unknown'],
    ['fetch failed', 'network'],
    ['strange failure', 'unknown'],
  ] as const)('ошибка %j → %s', (error, expected) => {
    expect(mapWorkoutError(error)).toBe(expected);
  });

  it('таймаут важнее сети, если ошибка похожа на обе', () => {
    expect(
      mapWorkoutError({ name: 'AbortError', message: 'Failed to fetch' })
    ).toBe('timeout');
  });
});

describe('getWorkoutErrorMessage', () => {
  it.each(ACTIONS)('для действия %s есть текст у каждого кода', (action) => {
    for (const code of CODES) {
      const message = getWorkoutErrorMessage(code, action);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('различает контекст сохранения и удаления', () => {
    expect(getWorkoutErrorMessage('not_found', 'delete')).toBe(
      'Тренировка не найдена — возможно, уже удалена.'
    );
    expect(getWorkoutErrorMessage('duplicate_id', 'save')).toBe(
      'Не удалось сохранить: запись с таким ID уже существует. Попробуйте ещё раз.'
    );
    expect(getWorkoutErrorMessage('forbidden', 'load')).toBe(
      'Нет доступа к тренировкам.'
    );
  });

  it('не выводит сырой текст ошибки Supabase', () => {
    const rawMessage = 'duplicate key value violates unique constraint';
    const code = mapWorkoutError({ code: '23505', message: rawMessage });
    const message = getWorkoutErrorMessage(code, 'save');

    expect(message).not.toContain(rawMessage);
    expect(message).not.toContain('duplicate key');
  });
});
