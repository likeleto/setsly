export type WorkoutErrorCode =
  | 'not_authenticated'
  | 'forbidden'
  | 'network'
  | 'timeout'
  | 'duplicate_id'
  | 'check_violation'
  | 'not_found'
  | 'unknown';

export type WorkoutResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: WorkoutErrorCode };

export type WorkoutErrorAction = 'load' | 'save' | 'delete';

const WORKOUT_ERROR_MESSAGES: Record<
  WorkoutErrorAction,
  Record<WorkoutErrorCode, string>
> = {
  load: {
    not_authenticated: 'Сессия истекла. Войдите снова.',
    forbidden: 'Нет доступа к тренировкам.',
    network: 'Нет связи с Supabase. Проверьте подключение.',
    timeout: 'Supabase не ответил вовремя. Попробуйте снова.',
    duplicate_id: 'Не удалось загрузить тренировки. Попробуйте ещё раз.',
    check_violation: 'Не удалось загрузить тренировки. Попробуйте ещё раз.',
    not_found: 'Не удалось загрузить тренировки. Попробуйте ещё раз.',
    unknown: 'Не удалось загрузить тренировки. Попробуйте ещё раз.',
  },
  save: {
    not_authenticated:
      'Не удалось сохранить: сессия истекла. Войдите снова.',
    forbidden: 'Не удалось сохранить: нет доступа к тренировкам.',
    network:
      'Не удалось сохранить: нет связи с Supabase. Проверьте подключение.',
    timeout:
      'Не удалось сохранить: Supabase не ответил вовремя. Попробуйте снова.',
    duplicate_id:
      'Не удалось сохранить: запись с таким ID уже существует. Попробуйте ещё раз.',
    check_violation:
      'Не удалось сохранить: данные тренировки не прошли проверку.',
    not_found: 'Не удалось сохранить тренировку. Попробуйте ещё раз.',
    unknown: 'Не удалось сохранить тренировку. Попробуйте ещё раз.',
  },
  delete: {
    not_authenticated:
      'Не удалось удалить: сессия истекла. Войдите снова.',
    forbidden: 'Не удалось удалить: нет доступа к тренировке.',
    network:
      'Не удалось удалить: нет связи с Supabase. Проверьте подключение.',
    timeout:
      'Не удалось удалить: Supabase не ответил вовремя. Попробуйте снова.',
    duplicate_id: 'Не удалось удалить тренировку. Попробуйте ещё раз.',
    check_violation: 'Не удалось удалить тренировку. Попробуйте ещё раз.',
    not_found: 'Тренировка не найдена — возможно, уже удалена.',
    unknown: 'Не удалось удалить тренировку. Попробуйте ещё раз.',
  },
};

export function getWorkoutErrorMessage(
  error: WorkoutErrorCode,
  action: WorkoutErrorAction
): string {
  return WORKOUT_ERROR_MESSAGES[action][error];
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
}

/**
 * Ошибки Supabase не показываются пользователю как есть:
 * UI работает только с кодами и своими сообщениями.
 */
export function mapWorkoutError(error: unknown): WorkoutErrorCode {
  if (!error) return 'unknown';

  if (typeof error !== 'object') {
    const message = String(error).toLowerCase();
    return message.includes('network') || message.includes('fetch')
      ? 'network'
      : 'unknown';
  }

  const supabaseError = error as SupabaseErrorLike;
  const message = supabaseError.message?.toLowerCase() ?? '';

  if (
    supabaseError.name === 'AbortError' ||
    message.includes('aborted') ||
    message.includes('timeout')
  ) {
    return 'timeout';
  }
  if (supabaseError.code === '23505') return 'duplicate_id';
  if (supabaseError.code === '23514') return 'check_violation';
  if (supabaseError.code === '42501') return 'forbidden';
  if (
    supabaseError.code === 'PGRST301' ||
    supabaseError.status === 401 ||
    message.includes('jwt') ||
    message.includes('session')
  ) {
    return 'not_authenticated';
  }
  if (supabaseError.code === 'PGRST116') return 'not_found';
  if (
    supabaseError.name === 'TypeError' ||
    message.includes('failed to fetch') ||
    message.includes('network')
  ) {
    return 'network';
  }

  return 'unknown';
}
