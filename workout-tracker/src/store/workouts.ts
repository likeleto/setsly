import type { ExerciseResult, OwnedWorkout, Workout } from '@/types';

export const WORKOUTS_TABLE = 'workouts';

export const WORKOUT_COLUMNS =
  'id, user_id, date, time, results, comment, created_at';

/** Строка public.workouts в том виде, в котором её отдаёт PostgREST. */
export interface WorkoutRow {
  id: string;
  user_id: string;
  date: string;
  time: string;
  results: ExerciseResult[];
  comment: string | null;
  created_at: string;
}

export type WorkoutInsert = Omit<WorkoutRow, 'created_at'>;

export type WorkoutUpdate = Omit<
  WorkoutRow,
  'id' | 'user_id' | 'created_at'
>;

/**
 * Приложение → БД.
 * user_id передаётся явно; RLS отклоняет чужой или пустой владелец.
 * created_at не передаётся — его ставит БД.
 */
export function toWorkoutInsert(workout: OwnedWorkout): WorkoutInsert {
  return {
    id: workout.id,
    user_id: workout.userId,
    date: workout.date,
    time: workout.time,
    results: workout.results,
    comment: workout.comment ?? null,
  };
}

/**
 * Приложение → БД для update.
 * id и user_id не обновляются: владельца меняет только сервер/RLS.
 * created_at сохраняет исходное значение.
 */
export function toWorkoutUpdate(workout: OwnedWorkout): WorkoutUpdate {
  return {
    date: workout.date,
    time: workout.time,
    results: workout.results,
    comment: workout.comment ?? null,
  };
}

/** БД → приложение: snake_case → camelCase. */
export function fromWorkoutRow(row: WorkoutRow): Workout {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    time: row.time,
    results: row.results,
    comment: row.comment ?? undefined,
    createdAt: row.created_at,
  };
}
