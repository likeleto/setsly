import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local (образец — .env.example).'
  );
}

/**
 * Единственный экземпляр клиента Supabase.
 *
 * Создаётся только здесь. Компоненты не импортируют @supabase/supabase-js
 * и не обращаются к БД напрямую — доступ идёт через src/store.
 *
 * Таймаут не даёт экрану входа зависнуть навсегда, если сеть недоступна:
 * прерванный запрос Supabase Auth превращается в ошибку `network`.
 */
const SUPABASE_TIMEOUT_MS = 20_000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    SUPABASE_TIMEOUT_MS
  );

  const externalSignal = init?.signal;
  const abortFromExternal = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', abortFromExternal, {
        once: true,
      });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', abortFromExternal);
  });
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  global: { fetch: fetchWithTimeout },
});
