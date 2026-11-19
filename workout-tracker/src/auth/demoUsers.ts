export interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

/**
 * Учебные аккаунты. Пароли лежат в исходниках намеренно: это mock-вход.
 * В продакшене пароли хранятся только на сервере в виде хеша.
 */
export const DEMO_USERS: readonly DemoUser[] = [
  {
    id: 'user-anna',
    name: 'Анна',
    email: 'anna@example.test',
    password: 'demo-anna-123',
  },
  {
    id: 'user-boris',
    name: 'Борис',
    email: 'boris@example.test',
    password: 'demo-boris-456',
  },
];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findDemoUserById(id: string): DemoUser | null {
  return DEMO_USERS.find((user) => user.id === id) ?? null;
}

export function findDemoUserByEmail(email: string): DemoUser | null {
  const normalized = normalizeEmail(email);
  return DEMO_USERS.find((user) => user.email === normalized) ?? null;
}

export function findDemoUserByCredentials(
  email: string,
  password: string
): DemoUser | null {
  const user = findDemoUserByEmail(email);
  return user && user.password === password ? user : null;
}

export function getDemoUserInitials(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}
