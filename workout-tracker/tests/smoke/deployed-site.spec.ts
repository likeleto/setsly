import { test, expect } from '@playwright/test';

/**
 * Smoke-тест опубликованного SPA (Playwright, чистый headless-браузер).
 *
 * Сценарий:
 *  1. Открыть #/history — гость видит форму входа.
 *  2. Войти по email и паролю → появляется UserBar, форма исчезает.
 *  3. Открыть историю через #/history → форма входа не рендерится.
 *  4. Обновить страницу → сессия восстановлена, история доступна.
 *
 * Переменные окружения (GitHub Actions Secrets):
 *   SMOKE_TEST_EMAIL  — подтверждённый тестовый аккаунт
 *   SMOKE_TEST_PASSWORD — его пароль
 *
 * ⚠️ Учётные данные НЕ попадают в лог и НЕ сохраняются в артефактах.
 */
test('history login and persistence', async ({ page }) => {
  const email = process.env.SMOKE_TEST_EMAIL!;
  const password = process.env.SMOKE_TEST_PASSWORD!;
  const pageUrl = process.env.PAGE_URL!;

  // ── 1. Гость видит экран входа ────────────────────────────────
  await page.goto(pageUrl + '#/history');

  await page.waitForLoadState('networkidle');
  await expect(page.locator('form')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Пароль')).toBeVisible();

  // ── 2. Входим по email и паролю ───────────────────────────────
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);

  // Берём кнопку входа из формы, а не табы
  await page.locator('form').getByRole('button', { name: 'Войти' }).click();

  // Кнопка меняет текст на «Вход...» и блокируется
  await expect(page.getByRole('button', { name: 'Вход...' })).toBeDisabled();

  // Ждём завершения авторизации и исчезновения формы
  await page.waitForLoadState('networkidle');
  await expect(page.getByLabel('Пароль')).not.toBeVisible({ timeout: 15_000 });

  // Проверяем что пользователь авторизован (UserBar)
  await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();

  // ── 3. Открываем историю напрямую ─────────────────────────────
  // Идём на #/history напрямую — так работаем с HashRouter,
  // у которого pathname парсится как /!/path, а не /path.
  await page.goto(pageUrl + '#/history');
  await page.waitForLoadState('networkidle');

  // Форма входа не должна быть на странице — пользователь авторизован
  await expect(page.locator('form')).not.toBeVisible({ timeout: 10_000 });

  // Страница рендерится (content area или UserBar + контент)
  await expect(page.locator('main, .app')).toBeVisible();

  // ── 4. Обновляем страницу — сессия должна сохраниться ──────────
  await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });

  // Сессия восстановлена Supabase SDK → пользователь авторизован
  await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();

  // Ещё раз открываем историю
  await page.goto(pageUrl + '#/history');
  await page.waitForLoadState('networkidle');

  // Форма входа не должна быть — сессия персистентна
  await expect(page.locator('form')).not.toBeVisible({ timeout: 10_000 });
});
