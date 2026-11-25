import type { Workout } from '@/types';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date-only строки (`YYYY-MM-DD`) разбираем как локальную дату.
 * `new Date('2026-11-25')` даёт UTC-полночь, и в часовых поясах западнее UTC
 * календарный день уезжает на предыдущий — в истории это выглядит как
 * «тренировка не того числа».
 */
function parseDate(dateStr: string): Date {
  if (DATE_ONLY_RE.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(dateStr);
}

export function formatDate(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('ru-RU', {
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
