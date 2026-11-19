import type { Workout } from '@/types';

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Сортировка тренировок от новых к старым по дате и времени. */
export function compareWorkoutsByDateDesc(a: Workout, b: Workout): number {
  const aKey = `${a.date}T${a.time}`;
  const bKey = `${b.date}T${b.time}`;
  return bKey.localeCompare(aKey);
}
