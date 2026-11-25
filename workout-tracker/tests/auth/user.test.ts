import { describe, expect, it } from 'vitest';
import { getUserInitials, toAuthUser } from '@/auth/user';

describe('toAuthUser', () => {
  it('берёт display_name и обрезает пробелы', () => {
    expect(
      toAuthUser({
        id: 'u-1',
        email: '  anna@example.com ',
        user_metadata: { display_name: '  Анна  ' },
      })
    ).toEqual({
      id: 'u-1',
      email: 'anna@example.com',
      displayName: 'Анна',
    });
  });

  it('падает обратно на full_name и name', () => {
    expect(
      toAuthUser({
        id: 'u-1',
        email: 'anna@example.com',
        user_metadata: { full_name: 'Anna P', name: 'anna' },
      }).displayName
    ).toBe('Anna P');

    expect(
      toAuthUser({
        id: 'u-1',
        email: 'anna@example.com',
        user_metadata: { name: 'anna' },
      }).displayName
    ).toBe('anna');
  });

  it('пропускает пустые метаданные и берёт локальную часть email', () => {
    expect(
      toAuthUser({
        id: 'u-1',
        email: 'anna@example.com',
        user_metadata: { display_name: '   ', full_name: '' },
      }).displayName
    ).toBe('anna');
  });

  it('без email и метаданных даёт запасное имя', () => {
    expect(toAuthUser({ id: 'u-1' })).toEqual({
      id: 'u-1',
      email: '',
      displayName: 'Пользователь',
    });
  });
});

describe('getUserInitials', () => {
  it('возвращает первую заглавную букву', () => {
    expect(getUserInitials(' анна')).toBe('А');
    expect(getUserInitials('Boris')).toBe('B');
  });

  it('для пустой строки возвращает пустую строку', () => {
    expect(getUserInitials('   ')).toBe('');
  });
});
