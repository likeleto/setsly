import { describe, expect, it } from 'vitest';
import { compareWorkoutsByDateDesc, formatDate } from '@/utils/date';
import type { Workout } from '@/types';

function workout(overrides: Partial<Workout>): Workout {
  return {
    id: 'w',
    date: '2026-11-25',
    time: '10:00',
    results: [],
    ...overrides,
  };
}

describe('formatDate', () => {
  it('показывает дату без сдвига на предыдущий день', () => {
    // date-only строка не должна разбираться как UTC-полночь.
    expect(formatDate('2026-11-25')).toBe('25 ноября 2026 г.');
  });

  it('форматирует дату с временем', () => {
    expect(formatDate('2026-01-02T12:00:00')).toBe('2 января 2026 г.');
  });
});

describe('compareWorkoutsByDateDesc', () => {
  it('ставит новые даты выше старых', () => {
    const newer = workout({ id: 'new', date: '2026-11-25' });
    const older = workout({ id: 'old', date: '2026-11-24' });

    expect(compareWorkoutsByDateDesc(newer, older)).toBeLessThan(0);
    expect(compareWorkoutsByDateDesc(older, newer)).toBeGreaterThan(0);
  });

  it('при одной дате ставит позднее время выше', () => {
    const later = workout({ id: 'later', time: '18:30' });
    const earlier = workout({ id: 'earlier', time: '09:05' });

    expect(compareWorkoutsByDateDesc(later, earlier)).toBeLessThan(0);
    expect(compareWorkoutsByDateDesc(earlier, later)).toBeGreaterThan(0);
  });

  it('сортирует массив от новых к старым', () => {
    const items = [
      workout({ id: 'a', date: '2026-11-20', time: '10:00' }),
      workout({ id: 'b', date: '2026-11-25', time: '09:05' }),
      workout({ id: 'c', date: '2026-11-25', time: '18:30' }),
    ];

    expect([...items].sort(compareWorkoutsByDateDesc).map((w) => w.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });
});
