# Fix Plan — Workout Tracker

Легенда: ✅ сделано · ⚠️ частично · ❌ не сделано
Статусы сверены с кодом 2026-11-25.

## P0 — Баги и защита данных (критичные)

### 1. Дублирование ID-генератора — ✅
- **Где:** `src/pages/InputScreen.tsx` + `src/types/index.ts`
- **Проблема:** Функция генерации ID скопирована в два места.
- **Решение:** Экспортировать `generateId()` из `src/utils/id.ts`, импортировать везде.
- **Сделано:** `src/utils/id.ts` — единственный источник; `InputScreen` импортирует из
  `@/utils/id`; мёртвая копия из `src/types/index.ts` удалена.

### 2. Валидация extraWeightKg при hasExtraWeight=false — ✅
- **Где:** `src/pages/InputScreen.tsx` (handleApproachChange)
- **Решение:** При toggle в `false` — сбрасывать `extraWeightKg` в `0`.

### 3. Блокировка двойного клика "Сохранить" — ✅
- **Где:** `src/pages/InputScreen.tsx` (handleSave)
- **Решение:** `isSaving` state + disable кнопки при `isSaving=true`; дополнительно
  синхронный guard `savingRef` от повторного вызова до ре-рендера.

### 9. Нет git и `.gitignore` — ⚠️ частично
- **Где:** корень проекта
- **Проблема:** нет истории и отката; `dist/` и `node_modules` лежат в дереве.
- **Решение:** `git init` + `.gitignore` (`node_modules`, `dist`, `.DS_Store`), первый коммит.
- **Сделано:** репозиторий инициализирован в `giga` (ветка `main`), `.gitignore` создан.
- **Осталось:** первый коммит и remote — делает пользователь вручную.

---

## P1 — UX

### 4. `alert()` / `confirm()` → inline-валидация — ✅
- **Где:** `src/pages/InputScreen.tsx`, `src/components/WorkoutAccordion.tsx`
- **Решение:** Состояние `validationErrors` + красный бордер + текст.
- **Сделано:** `alert()` убран, добавлен `validationError`. `window.confirm` заменён
  inline-подтверждением: отмена ввода в `InputScreen` (две кнопки) и удаление тренировки
  в `WorkoutAccordion` (две кнопки, подтверждение сбрасывается при сворачивании).

### 5. Убрать кнопку "Новая тренировка" на главной — ✅
- **Где:** `src/pages/MainScreen.tsx`

### 6. Сброс состояния после сохранения — ✅
- **Где:** `src/pages/InputScreen.tsx`
- **Решение:** Сброс подходов к одному пустому + `navigate('/')` (в плане было `navigate(-1)`).

### 10. Удалить неиспользуемые компоненты — ⚠️ частично
- **Где:** `src/components/ui/table.tsx`, `src/components/ui/dialog.tsx`
- **Проблема:** часть компонентов не импортируется.
- **Сделано:** `GoogleAccountDialog` удалён вместе с mock-Google, поэтому `dialog.tsx`
  снова не используется приложением.
- **Осталось:** `table.tsx` и `dialog.tsx` не используются — удалить или задействовать.

### 11. Удалить неиспользуемые зависимости — ❌
- **Где:** `package.json`
- **Проблема:** `@fontsource-variable/geist`, `clsx`, `tailwind-merge` не импортируются
  в коде приложения. `lucide-react` импортируется только внутри ui-компонентов
  (`dialog.tsx`, `tooltip.tsx`), которые приложение не использует.
- **Решение:** либо удалить, либо начать использовать по назначению.
  Для `clsx` + `tailwind-merge` предпочтительно — см. P2-14.

### 12. `tw-animate-css` не импортирован — ❌
- **Где:** `src/styles/global.css`
- **Проблема:** классы `animate-in` / `animate-out` используются в `tooltip.tsx` и `dialog.tsx`,
  но пакет не подключён — анимации не применяются.
- **Решение:** добавить `@import "tw-animate-css";` после `@import "tailwindcss";`.

### 13. Редактирование тренировки — ❌
- **Где:** PRD обещает «редактирование / удаление», в UI есть только удаление.
- **Решение:** либо реализовать (асинхронный `store.update` уже готов), либо убрать из PRD.
  В `prd.md` помечено как нереализованное.

---

## P2 — Архитектура

### 7. Shared дата-хелпер — ✅
- **Файлы:** `src/utils/date.ts`
- **Проблема:** `formatDate` был продублирован в `MainScreen` и `WorkoutAccordion`.
- **Сделано:** `formatDate` и `compareWorkoutsByDateDesc` вынесены в `@/utils/date`;
  дубли удалены, история и «Последняя тренировка» сортируются по дате и времени.

### 8. Shared компоненты — ✅
- **Файлы:** `src/components/ExerciseCard.tsx`, `ApproachRow.tsx`, `WorkoutAccordion.tsx`

### 14. Унифицировать `cn` — ❌
- **Где:** `src/lib/utils.ts`
- **Проблема:** `export { cn } from "cn"` — сторонний пакет `cn` вместо стандартного хелпера shadcn.
  `clsx` и `tailwind-merge` стоят в зависимостях, но не используются.
- **Решение:** реализовать `cn` через `clsx` + `tailwind-merge`, пакет `cn` удалить.

---

## P3 — Тесты и качество

### 15. Нет автотестов — ✅
- **Где:** весь проект
- **Проблема:** в PRD было «тестов нет»; ошибки payload, кодов ошибок, сессии и
  двойного клика ловились только вручную.
- **Решение:** Vitest + jsdom + Testing Library, тесты в `tests/`, Supabase подменяется
  моками; `npm run test` (tsc по `tsconfig.test.json` + Vitest) добавлен в обязательные
  проверки.
- **Сделано:** 13 файлов, 145 проверок — store и маппинг `public.workouts`, коды ошибок
  БД/Auth/OAuth, восстановление сессии, очистка OAuth-URL, `formatDate` без сдвига дня,
  двойной клик и inline-ошибки на `InputScreen`, `HistoryScreen`, `AuthScreen`,
  `UserBar`, состояния `App`.
- **Осталось:** RLS и реальные запросы к Supabase юнит-тестами не покрываются —
  нужны SQL-проверки и ручные сценарии из `prd.md`.

---

## Порядок
P0-1 → P0-9 → P1-10 → P1-11 → P1-12 → P1-13 → P1-4 → P2-7 → P2-14
