# Fix Plan — Workout Tracker

Легенда: ✅ сделано · ⚠️ частично · ❌ не сделано
Статусы сверены с кодом 2026-11-12.

## P0 — Баги и защита данных (критичные)

### 1. Дублирование ID-генератора — ⚠️ частично
- **Где:** `src/pages/InputScreen.tsx` + `src/types/index.ts`
- **Проблема:** Функция генерации ID скопирована в два места.
- **Решение:** Экспортировать `generateId()` из `src/utils/id.ts`, импортировать везде.
- **Сделано:** `src/utils/id.ts` создан, `InputScreen` импортирует из `@/utils/id`.
- **Осталось:** удалить мёртвую копию из `src/types/index.ts:38` (никто её не импортирует).

### 2. Валидация extraWeightKg при hasExtraWeight=false — ✅
- **Где:** `src/pages/InputScreen.tsx` (handleApproachChange)
- **Решение:** При toggle в `false` — сбрасывать `extraWeightKg` в `0`.

### 3. Блокировка двойного клика "Сохранить" — ✅
- **Где:** `src/pages/InputScreen.tsx` (handleSave)
- **Решение:** `isSaving` state + disable кнопки при `isSaving=true`.

### 9. Нет git и `.gitignore` — ❌
- **Где:** корень проекта
- **Проблема:** нет истории и отката; `dist/` и `node_modules` лежат в дереве.
- **Решение:** `git init` + `.gitignore` (`node_modules`, `dist`, `.DS_Store`), первый коммит.

---

## P1 — UX

### 4. `alert()` → inline-валидация — ⚠️ частично
- **Где:** `src/pages/InputScreen.tsx`
- **Решение:** Состояние `validationErrors` + красный бордер + текст.
- **Сделано:** `alert()` убран, добавлен `validationError`.
- **Осталось:** `window.confirm` в `InputScreen.tsx:93` (отмена ввода) и `WorkoutAccordion.tsx:71` (удаление).

### 5. Убрать кнопку "Новая тренировка" на главной — ✅
- **Где:** `src/pages/MainScreen.tsx`

### 6. Сброс состояния после сохранения — ✅
- **Где:** `src/pages/InputScreen.tsx`
- **Решение:** Сброс подходов к одному пустому + `navigate('/')` (в плане было `navigate(-1)`).

### 10. Удалить неиспользуемые компоненты — ⚠️ частично
- **Где:** `src/components/ui/table.tsx`, `src/components/ui/dialog.tsx`
- **Проблема:** часть компонентов не импортировалась.
- **Сделано:** `dialog.tsx` используется в `GoogleAccountDialog` (mock-выбор аккаунта).
- **Осталось:** `table.tsx` не используется — удалить или задействовать.

### 11. Удалить неиспользуемые зависимости — ❌
- **Где:** `package.json`
- **Проблема:** `@fontsource-variable/geist`, `clsx`, `tailwind-merge` не импортируются
  в коде приложения. `lucide-react` теперь используется через `dialog.tsx` и `GoogleAccountDialog`.
- **Решение:** либо удалить, либо начать использовать по назначению.
  Для `clsx` + `tailwind-merge` предпочтительно — см. P2-14.

### 12. `tw-animate-css` не импортирован — ❌
- **Где:** `src/styles/global.css`
- **Проблема:** классы `animate-in` / `animate-out` используются в `tooltip.tsx` и `dialog.tsx`,
  но пакет не подключён — анимации не применяются.
- **Решение:** добавить `@import "tw-animate-css";` после `@import "tailwindcss";`.

### 13. Редактирование тренировки — ❌
- **Где:** PRD обещает «редактирование / удаление», в UI есть только удаление.
- **Решение:** либо реализовать (метод `store.update` уже готов), либо убрать из PRD.
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

## Порядок
P0-1 → P0-9 → P1-10 → P1-11 → P1-12 → P1-13 → P1-4 → P2-7 → P2-14
