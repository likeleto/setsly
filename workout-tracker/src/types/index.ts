export type ExerciseKey = 'pullups' | 'pushups' | 'dips' | 'squats';

export interface Exercise {
  key: ExerciseKey;
  name: string;
  icon: string;
}

export const EXERCISES: Exercise[] = [
  { key: 'pullups', name: 'Подтягивания', icon: '💪' },
  { key: 'pushups', name: 'Отжимания', icon: '🏋️' },
  { key: 'dips', name: 'Брусья', icon: '🔝' },
  { key: 'squats', name: 'Приседания', icon: '🦵' },
];

export interface Approach {
  id: string;
  reps: number;
  hasExtraWeight: boolean;
  extraWeightKg: number;
}

export type ApproachField = 'reps' | 'extraWeightKg' | 'hasExtraWeight';

export interface ExerciseResult {
  exerciseKey: ExerciseKey;
  approaches: Approach[];
}

export interface Workout {
  id: string;
  /** Владелец записи. Отсутствует только у старых записей без владельца. */
  userId?: string;
  date: string;
  time: string;
  results: ExerciseResult[];
}

/** Новая тренировка всегда создаётся с владельцем. */
export type OwnedWorkout = Workout & { userId: string };

/** Unique ID generator — use everywhere instead of local copies */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
