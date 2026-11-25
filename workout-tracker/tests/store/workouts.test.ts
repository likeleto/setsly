import { describe, expect, it } from 'vitest';
import {
  fromWorkoutRow,
  toWorkoutInsert,
  toWorkoutUpdate,
  type WorkoutRow,
} from '@/store/workouts';
import type { ExerciseResult, OwnedWorkout } from '@/types';

const results: ExerciseResult[] = [
  {
    exerciseKey: 'pullups',
    approaches: [
      { id: 'a1', reps: 8, hasExtraWeight: true, extraWeightKg: 5 },
      { id: 'a2', reps: 6, hasExtraWeight: false, extraWeightKg: 0 },
    ],
  },
];

function makeOwnedWorkout(overrides: Partial<OwnedWorkout> = {}): OwnedWorkout {
  return {
    id: 'w-1',
    userId: 'user-1',
    date: '2026-11-25',
    time: '18:30',
    results,
    ...overrides,
  };
}

const row: WorkoutRow = {
  id: 'w-1',
  user_id: 'user-1',
  date: '2026-11-25',
  time: '18:30',
  results,
  comment: 'после разминки',
  created_at: '2026-11-25T18:31:02.000Z',
};

describe('toWorkoutInsert', () => {
  it('отправляет владельца в user_id и не перезаписывает created_at', () => {
    const insert = toWorkoutInsert(
      makeOwnedWorkout({ comment: 'заметка', createdAt: '2026-01-01T00:00:00Z' })
    );

    expect(insert).toEqual({
      id: 'w-1',
      user_id: 'user-1',
      date: '2026-11-25',
      time: '18:30',
      results,
      comment: 'заметка',
    });
    expect(insert).not.toHaveProperty('created_at');
    expect(insert).not.toHaveProperty('createdAt');
    expect(insert).not.toHaveProperty('userId');
  });

  it('без комментария отправляет null, а не undefined', () => {
    expect(toWorkoutInsert(makeOwnedWorkout()).comment).toBeNull();
  });

  it('не меняет форму подходов', () => {
    const insert = toWorkoutInsert(makeOwnedWorkout());

    expect(insert.results).toEqual(results);
    expect(insert.results[0].approaches[0]).toMatchObject({
      reps: 8,
      hasExtraWeight: true,
      extraWeightKg: 5,
    });
  });
});

describe('toWorkoutUpdate', () => {
  it('не отправляет id, user_id и created_at', () => {
    const update = toWorkoutUpdate(
      makeOwnedWorkout({ comment: 'обновлено', createdAt: '2026-01-01T00:00:00Z' })
    );

    expect(update).toEqual({
      date: '2026-11-25',
      time: '18:30',
      results,
      comment: 'обновлено',
    });
    expect(update).not.toHaveProperty('id');
    expect(update).not.toHaveProperty('user_id');
    expect(update).not.toHaveProperty('created_at');
  });

  it('без комментария отправляет null', () => {
    expect(toWorkoutUpdate(makeOwnedWorkout()).comment).toBeNull();
  });
});

describe('fromWorkoutRow', () => {
  it('переводит snake_case в camelCase и сохраняет данные тренировки', () => {
    expect(fromWorkoutRow(row)).toEqual({
      id: 'w-1',
      userId: 'user-1',
      date: '2026-11-25',
      time: '18:30',
      results,
      comment: 'после разминки',
      createdAt: '2026-11-25T18:31:02.000Z',
    });
  });

  it('null-комментарий превращает в undefined', () => {
    expect(fromWorkoutRow({ ...row, comment: null }).comment).toBeUndefined();
  });

  it('не теряет подходы при обратном преобразовании', () => {
    const restored = fromWorkoutRow(row);

    expect(restored.results).toEqual(results);
    expect(restored.results[0].approaches).toHaveLength(2);
  });
});
