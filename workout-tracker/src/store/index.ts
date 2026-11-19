import type { OwnedWorkout, Workout } from '@/types';
import { compareWorkoutsByDateDesc } from '@/utils/date';

const STORAGE_KEY = 'workout-tracker-data';

function loadData(): Workout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Workout[]) : [];
  } catch {
    // corrupted data, start fresh
    return [];
  }
}

function saveData(workouts: Workout[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

function isOwnedBy(workout: Workout, userId: string): boolean {
  return Boolean(userId) && workout.userId === userId;
}

/**
 * Учебный локальный store.
 *
 * Владелец проверяется здесь, а не только в UI. В продакшене эти проверки
 * обязаны выполняться на сервере: userId от клиента нельзя считать доверенным.
 */
export const store = {
  getAll: (userId: string): Workout[] =>
    loadData().filter((workout) => isOwnedBy(workout, userId)),

  getLast: (userId: string): Workout | null => {
    const workouts = store.getAll(userId).sort(compareWorkoutsByDateDesc);
    return workouts[0] ?? null;
  },

  add: (workout: OwnedWorkout): boolean => {
    if (!workout.userId) return false;
    const workouts = loadData();
    workouts.push(workout);
    saveData(workouts);
    return true;
  },

  update: (updated: OwnedWorkout, userId: string): boolean => {
    const workouts = loadData();
    const idx = workouts.findIndex((workout) => workout.id === updated.id);
    if (idx === -1 || !isOwnedBy(workouts[idx], userId)) return false;

    workouts[idx] = { ...updated, userId };
    saveData(workouts);
    return true;
  },

  remove: (id: string, userId: string): boolean => {
    const workouts = loadData();
    const idx = workouts.findIndex((workout) => workout.id === id);
    if (idx === -1 || !isOwnedBy(workouts[idx], userId)) return false;

    workouts.splice(idx, 1);
    saveData(workouts);
    return true;
  },

  /** Количество записей, созданных до появления пользователей. */
  getUnownedCount: (): number =>
    loadData().filter((workout) => !workout.userId).length,

  /**
   * Явный одноразовый перенос старых записей текущему пользователю.
   * Повторный вызов вернёт 0 и ничего не изменит.
   */
  claimUnowned: (userId: string): number => {
    if (!userId) return 0;

    let claimed = 0;
    const workouts = loadData().map((workout) => {
      if (workout.userId) return workout;
      claimed += 1;
      return { ...workout, userId };
    });

    if (claimed > 0) saveData(workouts);
    return claimed;
  },
};
