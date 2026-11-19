import type { OwnedWorkout, Workout } from '@/types';
import { mapWorkoutError, type WorkoutResult } from './errors';
import { supabase } from './supabase';
import {
  WORKOUTS_TABLE,
  WORKOUT_COLUMNS,
  fromWorkoutRow,
  toWorkoutInsert,
  toWorkoutUpdate,
  type WorkoutRow,
} from './workouts';

export type {
  WorkoutErrorAction,
  WorkoutErrorCode,
  WorkoutResult,
} from './errors';
export { getWorkoutErrorMessage } from './errors';

function isMissingUser(userId: string | undefined): boolean {
  return !userId;
}

async function loadAll(userId: string): Promise<WorkoutResult<Workout[]>> {
  if (isMissingUser(userId)) {
    return { ok: false, error: 'not_authenticated' };
  }

  try {
    const { data, error } = await supabase
      .from(WORKOUTS_TABLE)
      .select(WORKOUT_COLUMNS)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .returns<WorkoutRow[]>();

    if (error) {
      return { ok: false, error: mapWorkoutError(error) };
    }

    return { ok: true, data: (data ?? []).map(fromWorkoutRow) };
  } catch (error) {
    return { ok: false, error: mapWorkoutError(error) };
  }
}

/**
 * Асинхронный store тренировок.
 *
 * Единственный слой, который обращается к public.workouts. Компоненты получают
 * только доменные объекты Workout (camelCase) и коды ошибок.
 *
 * Владелец строки на сервере — auth.uid() и RLS. userId в чтении — только
 * UX-фильтр; update/remove работают по id, а чужие строки отсекает RLS.
 * При ошибке Supabase возвращается ошибка вызывающему коду: переключения
 * на localStorage нет.
 */
export const store = {
  getAll: (userId: string): Promise<WorkoutResult<Workout[]>> =>
    loadAll(userId),

  getLast: async (userId: string): Promise<WorkoutResult<Workout | null>> => {
    if (isMissingUser(userId)) {
      return { ok: false, error: 'not_authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from(WORKOUTS_TABLE)
        .select(WORKOUT_COLUMNS)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('time', { ascending: false })
        .limit(1)
        .maybeSingle()
        .returns<WorkoutRow>();

      if (error) {
        return { ok: false, error: mapWorkoutError(error) };
      }

      return { ok: true, data: data ? fromWorkoutRow(data) : null };
    } catch (error) {
      return { ok: false, error: mapWorkoutError(error) };
    }
  },

  add: async (workout: OwnedWorkout): Promise<WorkoutResult<Workout>> => {
    if (isMissingUser(workout.userId)) {
      return { ok: false, error: 'not_authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from(WORKOUTS_TABLE)
        .insert(toWorkoutInsert(workout))
        .select(WORKOUT_COLUMNS)
        .single()
        .returns<WorkoutRow>();

      if (error) {
        return { ok: false, error: mapWorkoutError(error) };
      }

      return { ok: true, data: fromWorkoutRow(data) };
    } catch (error) {
      return { ok: false, error: mapWorkoutError(error) };
    }
  },

  update: async (updated: OwnedWorkout): Promise<WorkoutResult<Workout>> => {
    if (isMissingUser(updated.userId)) {
      return { ok: false, error: 'not_authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from(WORKOUTS_TABLE)
        .update(toWorkoutUpdate(updated))
        .eq('id', updated.id)
        .select(WORKOUT_COLUMNS)
        .maybeSingle()
        .returns<WorkoutRow>();

      if (error) {
        return { ok: false, error: mapWorkoutError(error) };
      }
      if (!data) {
        return { ok: false, error: 'not_found' };
      }

      return { ok: true, data: fromWorkoutRow(data) };
    } catch (error) {
      return { ok: false, error: mapWorkoutError(error) };
    }
  },

  remove: async (id: string): Promise<WorkoutResult<void>> => {
    try {
      const { data, error } = await supabase
        .from(WORKOUTS_TABLE)
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) {
        return { ok: false, error: mapWorkoutError(error) };
      }
      if (!data) {
        return { ok: false, error: 'not_found' };
      }

      return { ok: true, data: undefined };
    } catch (error) {
      return { ok: false, error: mapWorkoutError(error) };
    }
  },
};
