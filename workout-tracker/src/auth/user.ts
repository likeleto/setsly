export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface SupabaseUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

/**
 * Преобразование пользователя Supabase Auth в модель приложения.
 *
 * Пароль и токены сюда не попадают: Supabase хранит их сам.
 */
export function toAuthUser(user: SupabaseUserLike): AuthUser {
  const email = user.email?.trim() ?? '';
  const metadata = user.user_metadata ?? {};
  const name = [metadata.display_name, metadata.full_name, metadata.name].find(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0
  );

  return {
    id: user.id,
    email,
    displayName: name?.trim() || email.split('@')[0] || 'Пользователь',
  };
}

export function getUserInitials(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase();
}
