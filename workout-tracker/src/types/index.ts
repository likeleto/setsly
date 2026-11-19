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
  /** Комментарий к тренировке. В UI пока не редактируется. */
  comment?: string;
  /** Серверное время создания; read-only, в UI не используется. */
  createdAt?: string;
}

/** Новая тренировка всегда создаётся с владельцем. */
export type OwnedWorkout = Workout & { userId: string };
