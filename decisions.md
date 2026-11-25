# Журнал решений

## 2026-11-09 — Tailwind CSS 4 + shadcn/ui вместо plain CSS

**Контекст:** в PRD v1 был выбран plain CSS без Tailwind «для MVP без лишних зависимостей».
При реализации понадобились готовые компоненты (switch, badge, tooltip) и единая тёмная тема.

**Решение:** перешли на Tailwind CSS 4 + shadcn/ui (style `base-nova`, на `@base-ui/react`).
Тема задаётся токенами `@theme` в `src/styles/global.css`, класс `dark` на `<body>`.

**Последствия:**
- Раздел «Технические решения» в `prd.md` обновлён.
- Появились `src/components/ui/*` — генерируемые примитивы.
- Добавлен кастомный вариант `success` у `Button`.
- Добавлены зависимости shadcn-стека; часть из них пока не используется (см. `fix-plan.md`).
- Подробности выполнения — в `migration-plan.md`.

## 2026-11-12 — Учебный mock-вход и владелец тренировки

**Контекст:** на занятии нужно показать три способа входа, переключение пользователей и
отдельную историю тренировок. Подключать сервер, настоящий OAuth и отправку писем нельзя.

**Решение:**
- Добавлены два демонстрационных аккаунта с постоянными `id` (`user-anna`, `user-boris`)
  в `src/auth/demoUsers.ts`.
- Вход по паролю, вход по коду и mock-Google реализованы в `src/auth/AuthContext.tsx`
  как учебный провайдер с задержкой проверки.
- Пароли и коды не попадают в storage. Сессия хранится отдельно от тренировок в ключе
  `workout-tracker-session` и содержит только `userId`.
- У `Workout` появился `userId`. В `src/store/index.ts` владелец проверяется при чтении,
  обновлении и удалении. Старые записи без владельца переносятся только явным
  подтверждением через `claimUnowned`.
- Google-вход сделан локальным диалогом; настоящий OAuth не подключался.

**Последствия:**
- UI получил экран входа, панель пользователя, диалог выбора аккаунта и баннер legacy-записей.
- Появились состояния «гость», «проверка», «ошибка», «вошёл».
- Разделение работает только в браузерном прототипе: `localStorage` и клиентские проверки
  не защищают данные от человека с доступом к браузеру. Для продакшена потребуется серверная
  авторизация; `userId` от клиента нельзя считать доверенным.
- Новых зависимостей нет; использован существующий `dialog.tsx`.
- Подробный план и сценарии — в `auth-plan.md`.

## 2026-11-19 — Серверный этап: Supabase (Postgres + Auth)

**Контекст:** mock-вход и `localStorage` не защищают данные: владелец проверяется в браузере,
`userId` приходит с клиента и может быть подменён. Нужен серверный источник истины для
пользователей и тренировок.

**Решение:**
- Бэкенд — Supabase: Postgres для данных, Supabase Auth для пользователей.
- Таблица `public.workouts`: `id text` (сохраняет существующие строковые ID), `user_id uuid`
  с FK на `auth.users(id)` и `default auth.uid()`, `date date`, `time text`, `results jsonb`
  (вложенная структура `ExerciseResult[]` сохраняется), `comment text` (до 500 символов),
  `created_at timestamptz`. Индекс по `user_id`.
- RLS включён; четыре отдельные политики для `authenticated` (SELECT / INSERT / UPDATE / DELETE)
  по `auth.uid() = user_id`. У `UPDATE` проверяются и старый, и новый владелец. У `anon`
  нет ни прав на таблицу, ни политик.
- Схема и политики лежат в `supabase-workouts.sql` в корне и применяются в SQL Editor.
- Доступ к данным остаётся только через `src/store`; клиент Supabase создаётся внутри этого
  слоя. Компоненты не импортируют `@supabase/supabase-js` и не обращаются к БД напрямую.
- Зависимость `@supabase/supabase-js` установлена (`2.119.x`, lock-файл обновлён). Клиент —
  один экземпляр в `workout-tracker/src/store/supabase.ts`; операции тренировок пока не переведены
  на него.
- Ключи — `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` из `.env.local`. Образец без
  значений — `workout-tracker/.env.example`. `service_role` в браузерное приложение не попадает.
- Существующие записи в `localStorage` не удаляются и не переносятся автоматически.
  Перенос старых данных — отдельное явное действие с подтверждением.

**Последствия:**
- `src/store` станет асинхронным: вызовам нужны `await`, состояния загрузки и inline-ошибки,
  защита кнопок от двойного клика.
- Mock-аккаунты `demoUsers` перестанут быть источником пользователей; `userId` будет UUID
  из Supabase Auth. Старые `user-anna` / `user-boris` несовместимы с `user_id uuid`.
- `Workout` нужно дополнить `comment?: string`; `created_at` остаётся серверным полем.
- `claimUnowned` в текущем виде не переносится: автоматическое присвоение владельца
  противоречит решению о ручном переносе.
- Историю нужно сортировать явно по `date` и `time`: порядок строк в БД не гарантирован.
- Обновлены `AGENTS.md` и `data-model.md`; SQL — `supabase-workouts.sql`.

## 2026-11-19 — Настоящий вход Supabase Auth вместо mock

**Контекст:** mock-вход проверял пароль в браузере, а демонстрационные пароли лежали
в исходниках. Нужен настоящий вход, но тренировки на этом этапе ещё нельзя переводить
на сервер: сначала фиксируем работающую авторизацию.

**Решение:**
- Вход — `supabase.auth.signInWithPassword` с email и паролем. Сессия восстанавливается
  через `getSession`, изменения обрабатываются `onAuthStateChange`, выход — `signOut`.
- Auth-слой использует единственный клиент из `src/store/supabase.ts`; второй `createClient`
  не создаётся, ключи остаются в env.
- В приложении появился `AuthUser` с UUID Supabase, email и отображаемым именем из
  `user_metadata`. Пароль в модель приложения не попадает.
- Mock-аккаунты, вход по коду и mock-Google удалены. Старый ключ
  `workout-tracker-session` больше не читается и не считается сессией.
- Тренировки остаются локальными. Новые записи получают UUID Supabase-пользователя,
  операции store не переводятся на Supabase на этом этапе.
- Пароли не хранятся в коде, документации и логах. Ошибки Supabase переводятся в коды
  и понятные сообщения; сырой текст ошибки в UI не выводится.
- Регистрация и восстановление пароля не входят в этап. Аккаунты создаются
  в Supabase Dashboard.

**Последствия:**
- Вход теперь настоящий, но данные всё ещё локальные: `userId` для store приходит
  с клиента, проверки владельца остаются UX-слоем.
- Старые записи с mock-идентификаторами не видны новым аккаунтам и автоматически
  не переносятся; записи без владельца по-прежнему можно явно перенести на текущий аккаунт.
- `workout-tracker-session` может остаться в браузере, но ни на что не влияет.
- Следующий шаг — перевести тренировки в `public.workouts` и включить RLS из
  `supabase-workouts.sql`.
- Обновлены `AGENTS.md`, `prd.md`, `auth-plan.md`, `data-model.md`, `fix-plan.md`
  и `migration-plan.md`.

## 2026-11-19 — Тренировки в `public.workouts`, асинхронный store

**Контекст:** схема и RLS были готовы, но store продолжал читать и писать
`localStorage`. Владелец проверялся только в браузере, а данные не были защищены
на сервере. Пора подключить таблицу `public.workouts`.

**Решение:**
- `src/store` переведён на Supabase и стал асинхронным: `getAll`, `getLast`,
  `add`, `update`, `remove` возвращают `WorkoutResult` с кодом ошибки.
- Явный маппинг полей вынесен в `src/store/workouts.ts`:
  `userId ↔ user_id`, `createdAt ↔ created_at`, `comment → comment`.
  `created_at` ставит БД, клиент его не отправляет и не перезаписывает.
- `results` передаётся в `jsonb` как объект, без двойной сериализации.
- Владелец строки — `auth.uid()` и RLS. `getAll`/`getLast` используют `user_id`
  только как UX-фильтр; `update`/`remove` работают по `id`, чужие строки отсекает RLS.
- `add` передаёт `user_id` явно, `INSERT`-политика проверяет совпадение с `auth.uid()`.
- Ошибки Supabase (`42501`, `23505`, `23514`, сеть, таймаут) переводятся в коды
  и показываются inline. Переключения на `localStorage` при ошибке нет.
- `MainScreen`, `HistoryScreen`, `InputScreen` переведены на `await`, получили
  состояния загрузки и inline-ошибки. Удаление защищено от двойного клика.
- `LegacyDataNotice` удалён вместе с `getUnownedCount` и `claimUnowned`. Старые
  записи в `workout-tracker-data` остаются нетронутыми, автоматического импорта нет.
- `Workout` дополнен `comment?: string` и read-only `createdAt?: string`. Поля
  комментария в UI пока нет — только хранение и маппинг.

**Последствия:**
- История после переключения пустая, пока в `public.workouts` не появятся записи.
  Старые локальные тренировки остаются в браузере, но приложение их не показывает.
- `scripts/seed.js` и `seeds.html` пишут только legacy-ключ и на серверные данные
  не влияют.
- `anon` не имеет доступа к таблице; пользователь видит только свои строки.
- Обновлены `AGENTS.md`, `prd.md`, `data-model.md`, `auth-plan.md` и `fix-plan.md`.

## 2026-11-19 — Настоящий вход через Google OAuth

**Контекст:** после перехода на Supabase Auth вход был только по email и паролю,
а на экране прямо сообщалось, что Google отключён. Провайдер Google уже настроен
в Supabase (Client ID и Client Secret лежат в Dashboard), поэтому можно включить
настоящий OAuth без хранения секретов в приложении.

**Решение:**
- Google-вход — `supabase.auth.signInWithOAuth({ provider: 'google' })` в
  `src/auth/AuthContext.tsx`. Используется тот же единственный клиент из
  `src/store/supabase.ts`; второй `createClient` не создаётся.
- `redirectTo` — `window.location.origin`, то есть Site URL из настроек Supabase
  (`http://localhost:3000` локально). После возврата сессию подхватывает
  `onAuthStateChange`; отдельного callback-маршрута нет.
- OAuth-параметры из URL (токены или `error`) читаются один раз и удаляются через
  `history.replaceState`: токены не остаются в истории браузера, сообщение об
  ошибке не повторяется после F5.
- Ошибки Google переводятся в коды `oauth_cancelled` / `oauth_failed` (плюс
  существующие `network`, `rate_limited`) и показываются inline рядом с кнопкой.
  Сырой текст Supabase/Google в UI не выводится.
- Client ID и Client Secret Google остаются только в Supabase Dashboard. В код,
  `.env.local` и документацию они не добавляются.
- Вход по email и паролю, выход и серверное хранение тренировок не менялись.
  Схема БД и RLS-политики не затрагивались.

**Последствия:**
- Для локальной проверки в Supabase → Authentication → URL Configuration должны
  совпадать Site URL / Redirect URLs с `http://localhost:3000`.
- Пользователь, вошедший через Google, получает `user_id` от Supabase Auth и видит
  только свои строки в `public.workouts` — так же, как при входе по паролю.
- Регистрация, подтверждение email и восстановление пароля по-прежнему вне
  приложения.
- Обновлены `AGENTS.md`, `prd.md` и `auth-plan.md`.

## 2026-11-19 — Регистрация и восстановление пароля

**Контекст:** регистрация и восстановление пароля были намеренно исключены —
аккаунты создавались вручную в Supabase Dashboard. Пользователи без аккаунта
не могли зайти в приложение самостоятельно.

**Решение:**
- Добавлены методы `signUp` и `resetPassword` в `AuthContext`.
- `AuthScreen` расширен тремя режимами: `login`, `register`, `resetPassword`.
- Переключение — вкладками внутри карточки; каждый режим валидирует свои поля.
- `signUp` вызывает `supabase.auth.signUp()` — не входит автоматически;
  пользователь получает письмо с подтверждением.
- `resetPassword` вызывает `supabase.auth.resetPasswordForEmail()` с
  `redirectTo: window.location.origin` — Supabase хостит страницу сброса.
- Новые коды ошибок: `sign_up_exists`, `sign_up_failed`, `reset_password_failed`.
- `clearResetSent` сбрасывает состояние успеха для повторных попыток.

**Последствия:**
- Регистрация требует подтверждения email (настраивается в Supabase).
- Восстановление пароля использует hosted-страницу Supabase; `redirect_url`
  настраивается в Authentication → URL Configuration.
- Обновлены `auth-plan.md` и `decisions.md`.

## 2026-11-25 — Юнит-тесты на Vitest

**Контекст:** в PRD было зафиксировано «тестов нет»: регрессии ловились только
`npm run build` и ручными сценариями. Самые дорогие ошибки при этом тихие — неверный
payload в `public.workouts` (отказ RLS после ввода подходов), неверная классификация
ошибки Supabase, зависшее восстановление сессии, повторное сохранение по двойному
клику, токены OAuth в адресной строке.

**Решение:**
- Добавлены dev-зависимости `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/dom`, `@testing-library/jest-dom`. Скрипты — `npm run test`
  и `npm run test:watch`.
- Конфиг Vitest живёт в `vite.config.ts` (`defineConfig` из `vitest/config`),
  окружение по умолчанию `node`, тесты — в `workout-tracker/tests/`. Это вне `src`,
  поэтому `tsc` в `npm run build` не проверяет тестовые файлы; их типы проверяет
  отдельный `tsconfig.test.json` в начале `npm run test`.
- UI- и URL-тесты помечены `// @vitest-environment jsdom`; общий setup —
  `tests/setup.ts` (jest-dom, cleanup, очистка storage).
- Supabase в тестах не настоящий: `@/store/supabase` подменяется моками,
  PostgREST-цепочка — thenable-билдером. Чистые функции (`workouts.ts`, `errors.ts`,
  `auth/errors.ts`, `auth/user.ts`, `oauthRedirect.ts`, `utils/date.ts`) тестируются
  без моков.
- Покрыто 145 проверками: контракт `store` (payload, `user_id`, отсутствие
  `created_at`, маппинг, коды ошибок, отсутствие записи в `localStorage`), ошибки
  Auth и OAuth, восстановление сессии (`getSession` + `onAuthStateChange`), очистка
  OAuth-параметров из URL, двойной клик и inline-ошибки на `InputScreen`,
  `HistoryScreen`, `AuthScreen`, `UserBar`, состояния `App` и сортировка истории.
- Заодно исправлен `formatDate`: date-only строка `YYYY-MM-DD` разбирается как
  локальная дата. Раньше `new Date('2026-11-25')` давал UTC-полночь, и в часовых
  поясах западнее UTC история показывала предыдущий день.

**Последствия:**
- `npm run test` — обязательная проверка вместе с `npm run build`; обновлены
  `AGENTS.md`, `prd.md` и `fix-plan.md`.
- Юнит-тесты проверяют контракт клиента, но не RLS: «чужой не видит чужие строки»
  и поведение политик остаются SQL/ручными проверками из `prd.md`.
- Тесты не требуют `.env.local`: модуль с клиентом Supabase всегда подменяется,
  а чистые тесты его не импортируют.
- Сеть, реальный Supabase и браузерный OAuth в юнит-тестах не участвуют; для
  сквозных сценариев по-прежнему нужны ручной прогон или отдельный e2e-инструмент.

## 2026-11-25 — Публикация на GitHub Pages

**Контекст:** приложение нужно отдавать с GitHub Pages как project site —
`https://<user>.github.io/<repo>/`. Сборка с корневым `base` и `BrowserRouter`
ломается в подкаталоге: ресурсы запрашиваются из `/assets`, а прямой заход или
F5 на `/history` отдаёт 404 от Pages.

**Решение:**
- `base` вычисляется в `vite.config.ts` функцией `resolveBase()`: `VITE_BASE_PATH`
  (ручной запуск, user site — `/`), затем `GITHUB_REPOSITORY` (GitHub Actions),
  затем имя каталога репозитория (`.../giga` → `/giga/`). В dev-режиме `base`
  остаётся `/`, чтобы не менять Site URL Supabase `http://localhost:3000`;
  для `vite build` и `vite preview` (mode=production) действует вычисленный `base`.
- Роутинг переведён с `BrowserRouter` на `HashRouter`: маршрут живёт в hash
  (`/#/history`), поэтому F5 и прямой заход на историю отдаются одним `index.html`
  без серверных rewrite-правил. Пути в компонентах (`/`, `/workout/:key`,
  `/history`) не менялись.
- `redirectTo` для Google OAuth и восстановления пароля — `getAuthRedirectUrl()`,
  то есть `origin + import.meta.env.BASE_URL`. Одного `origin` на Pages мало:
  возврат ушёл бы на корень домена вместо подкаталога приложения.
- `clearAuthRedirectParams()` после удаления токенов оставляет валидный маршрут
  `#/` и шлёт `hashchange` (его не шлёт `replaceState`), иначе HashRouter
  остаётся на «маршруте» из OAuth-параметров и экран пустой.
- `public/.nojekyll` попадает в `dist/`, чтобы Pages не обрабатывал сборку Jekyll.

**Последствия:**
- URL приложения — `https://<user>.github.io/<repo>/#/...`; для user site или
  своего домена сборка идёт с `VITE_BASE_PATH=/`.
- В Supabase → Authentication → URL Configuration нужно добавить
  `https://<user>.github.io/<repo>/` в Site URL / Redirect URLs.
- Вход по email и паролю и серверное хранение (`public.workouts` через `src/store`)
  не менялись; `src/store` и RLS не затрагивались.
- Локальная проверка сборки — `npm run preview` по адресу
  `http://localhost:4173/<repo>/`.
