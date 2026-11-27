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
 * Переменные окружения (GitHub Actions Secrets / outputs):
 *   PAGE_URL            — адрес опубликованного сайта (output job deploy)
 *   SMOKE_TEST_EMAIL    — подтверждённый тестовый аккаунт
 *   SMOKE_TEST_PASSWORD — его пароль
 *
 * ⚠️ Учётные данные НЕ попадают в лог и НЕ сохраняются в артефактах.
 *
 * ⚠️ Промежуточные состояния («Проверяем сессию...», «Вход...», disabled-кнопка)
 * не проверяются: ответ Supabase может прийти раньше первого опроса и элемент
 * уже исчезнет. Проверяем только устойчивый исход — UserBar или inline-ошибку.
 */
test('history login and persistence', async ({ page }) => {
  const email = process.env.SMOKE_TEST_EMAIL;
  const password = process.env.SMOKE_TEST_PASSWORD;
  const pageUrl = process.env.PAGE_URL;

  expect(email, 'SMOKE_TEST_EMAIL не задан').toBeTruthy();
  expect(password, 'SMOKE_TEST_PASSWORD не задан').toBeTruthy();
  expect(pageUrl, 'PAGE_URL не задан (output job deploy)').toBeTruthy();

  // page_url из deploy-pages уже с завершающим слешем, но приводим к канону.
  const base = `${pageUrl!.replace(/#.*$/, '').replace(/\/+$/, '')}/`;
  const historyUrl = `${base}#/history`;

  const signOutButton = page.getByRole('button', { name: 'Выйти' });
  const authAlert = page.getByRole('alert').first();
  const loginForm = page.locator('form');

  // ── 1. Гость видит экран входа ────────────────────────────────
  await test.step('гость видит форму входа', async () => {
    await page.goto(historyUrl);

    await expect(loginForm).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Пароль')).toBeVisible();
  });

  // ── 2. Входим по email и паролю ───────────────────────────────
  await test.step('вход по email и паролю', async () => {
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Пароль').fill(password!);

    // Берём кнопку входа из формы, а не табы
    await loginForm.getByRole('button', { name: 'Войти' }).click();

    // Ждём исход: успех (UserBar) или inline-ошибка входа.
    await expect(authAlert.or(signOutButton)).toBeVisible({ timeout: 25_000 });

    if (await authAlert.isVisible()) {
      const message = (await authAlert.innerText()).trim();
      throw new Error(
        `Вход не выполнен. Приложение показало: «${message}». ` +
          'Проверь SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD и настройки Supabase Auth.',
      );
    }

    // Проверяем что пользователь авторизован (UserBar)
    await expect(signOutButton).toBeVisible();
    await expect(page.getByText(email!, { exact: true })).toBeVisible();
  });

  // ── 3. Открываем историю напрямую ─────────────────────────────
  // Идём на #/history напрямую — так работаем с HashRouter,
  // у которого pathname парсится как /!/path, а не /path.
  await test.step('история доступна без формы входа', async () => {
    await page.goto(historyUrl);

    // Форма входа не должна быть на странице — пользователь авторизован
    await expect(signOutButton).toBeVisible({ timeout: 15_000 });
    await expect(loginForm).toHaveCount(0);

    // Страница рендерится (content area)
    await expect(page.locator('main, .app').first()).toBeVisible();
  });

  // ── 4. Обновляем страницу — сессия должна сохраниться ──────────
  await test.step('сессия переживает перезагрузку', async () => {
    // networkidle не ждём: Supabase-клиент может держать соединения,
    // а нужные элементы и так дожидаются локаторами.
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Сессия восстановлена Supabase SDK → пользователь авторизован
    await expect(signOutButton).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(email!, { exact: true })).toBeVisible();

    // Ещё раз открываем историю
    await page.goto(historyUrl);
    await expect(signOutButton).toBeVisible({ timeout: 15_000 });
    await expect(loginForm).toHaveCount(0);
  });
});
