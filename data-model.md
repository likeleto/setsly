# Модель данных — Workout Tracker

Актуально на 2026-11-19. Источник истины — `workout-tracker/src/types/index.ts`,
`workout-tracker/src/store/index.ts`, `workout-tracker/src/store/workouts.ts`
и `supabase-workouts.sql`. При расхождении прав код, затем этот файл.

Вход и сессия — Supabase Auth. Тренировки хранятся в `public.workouts` (Postgres)
и доступны только через асинхронный `src/store`. `localStorage` приложение для
тренировок больше не использует; старые записи остаются в браузере нетронутыми
и автоматически не импортируются.

## 1. Сущности и поля

### Workout — тренировка (корневая сущность)

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `id` | `string` | да | `generateId()`; в БД — `text PRIMARY KEY`, коллизия даёт `23505` |
| `userId` | `string` | да у новых | владелец, UUID Supabase Auth. В БД — `user_id uuid NOT NULL` |
| `date` | `string` | да | `YYYY-MM-DD`, берётся из `toISOString()` → **UTC** |
| `time` | `string` | да | `HH:MM`, локальное время (`toTimeString()`) |
| `results` | `ExerciseResult[]` | да | в БД `jsonb`; CHECK проверяет только, что это массив |
| `comment` | `string` | нет | до 500 символов; в UI пока не редактируется |
| `createdAt` | `string` | нет | `timestamptz` с сервера, read-only; в UI не используется |

`OwnedWorkout = Workout & { userId: string }` — тип для новых записей.
`store.add` принимает только его. `createdAt` при вставке и обновлении не
передаётся: его ставит БД.

### ExerciseResult — результат по одному упражнению

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `exerciseKey` | `ExerciseKey` | да | ссылка на справочник `EXERCISES` |
| `approaches` | `Approach[]` | да | может быть пустым |

Из UI всегда создаётся ровно один `ExerciseResult` (одна тренировка = одно
упражнение). Несколько результатов в одной записи умеет только legacy-скрипт
`scripts/seed.js`.

### Approach — подход

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `id` | `string` | да | `generateId()`; уникален в пределах тренировки |
| `reps` | `number` | да | повторений, должно быть ≥ 1 |
| `hasExtraWeight` | `boolean` | да | есть ли доп. вес |
| `extraWeightKg` | `number` | да | кг; `0`, если `hasExtraWeight = false` |

### Exercise — справочник упражнений (в данных не хранится)

Константа `EXERCISES` в `src/types/index.ts`, 4 записи:

| `key` | `name` | `icon` |
|---|---|---|
| `pullups` | Подтягивания | 💪 |
| `pushups` | Отжимания | 🏋️ |
| `dips` | Брусья | 🔝 |
| `squats` | Приседания | 🦵 |

В тренировке хранится только `key`. Переименование упражнения в коде не меняет
старые записи.

### AuthUser — пользователь Supabase Auth

`src/auth/user.ts`. Поля: `id` (UUID), `email`, `displayName`. Имя берётся из
`user_metadata` (`display_name`, `full_name`, `name`), иначе — часть email до `@`.
Пароль и токены в модель приложения не попадают: их обрабатывает Supabase SDK.
Аккаунты создаются в Supabase Dashboard; регистрации в приложении нет.

### Session — сессия Supabase

Управляется Supabase SDK: `getSession`, `onAuthStateChange`, `signOut`. Токены
хранятся в storage под ключом SDK (`sb-...-auth-token`), приложение их не читает
и не логирует. Старый mock-ключ `workout-tracker-session` не используется.

## 2. Связи

```
auth.users (Supabase)
   │ 1
   │ N            user_id uuid → auth.users(id) ON DELETE CASCADE
Workout ──── 1:N ──── ExerciseResult ──── 1:N ──── Approach
   │                        │
   │                        └── exerciseKey ──▶ Exercise (код, справочник)
   │
   └── агрегат: results и approaches вложены, отдельных таблиц нет
```

- **`Workout` — корень агрегата.** `results` и `approaches` принадлежат только
  ему и ни с чем не разделяются.
- **Связь с пользователем — `user_id`.** Владелец строки на сервере —
  `auth.uid()`; RLS не даёт читать, менять и удалять чужие строки.
- **Связь с упражнением — по `exerciseKey`**, справочник в коде, а не в данных.

## 3. Обязательные значения и где они проверяются

| Правило | Где проверяется |
|---|---|
| `userId` заполнен у новой записи | `store.add` → `not_authenticated`; в БД `NOT NULL` и `default auth.uid()` |
| `user_id` совпадает с `auth.uid()` | RLS-политики `INSERT` / `UPDATE` / `DELETE` / `SELECT` |
| `reps ≥ 1` | только UI: `InputScreen.handleSave` |
| `extraWeightKg = 0` при `hasExtraWeight = false` | только UI: `InputScreen.handleApproachChange` |
| `comment` ≤ 500 символов | CHECK `workouts_comment_max_length` |
| `results` — массив | CHECK `workouts_results_is_array`; форма вложенных объектов не проверяется |
| `exerciseKey` ∈ 4 значений | только типы TypeScript |
| `date` / `time` в нужном формате | нигде, соглашение |
| `id` уникален | `PRIMARY KEY`; конфликт возвращается как `duplicate_id` |
| один `ExerciseResult` на упражнение | нигде (соблюдается в legacy `seed.js` через `Set`) |

Store не валидирует форму `results` — он доверяет типам. Всё, что пришло в обход
UI, сохранится, если проходит ограничения БД.

## 4. Операции store (асинхронные)

Все методы возвращают `WorkoutResult<T>`:

```ts
type WorkoutResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: WorkoutErrorCode };
```

| Операция | Поведение |
|---|---|
| `store.getAll(userId)` | `select` по `user_id`, сортировка `date desc`, затем `time desc`; `userId` — UX-фильтр, RLS — защита |
| `store.getLast(userId)` | та же сортировка + `limit 1`; `null`, если записей нет |
| `store.add(workout)` | `insert` с явным `user_id`; RLS проверяет владельца; возвращает строку с `created_at` |
| `store.update(updated)` | `update` по `id`; `id`, `user_id` и `created_at` не меняются; RLS проверяет владельца |
| `store.remove(id)` | `delete` по `id`; RLS не даёт удалить чужое; если строка не найдена — `not_found` |

Ошибки возвращаются кодами и показываются inline:

| Код | Когда |
|---|---|
| `not_authenticated` | нет сессии / истёк JWT |
| `forbidden` | RLS или нет прав (`42501`) |
| `network` / `timeout` | нет связи или запрос прерван по таймауту |
| `duplicate_id` | конфликт `PRIMARY KEY` (`23505`) |
| `check_violation` | нарушение CHECK (`23514`) |
| `not_found` | `update` / `delete` не затронули строку |
| `unknown` | остальное |

При ошибке сервера store **не переключается** на `localStorage` и не возвращает
пустой успешный результат. Решение об ошибке принимает вызывающий компонент.

**Каскадов на клиенте нет и не нужно:** подходы и результаты вложены в тренировку
и удаляются вместе с ней. Удаление тренировки не затрагивает другие записи.

**Выход из аккаунта** (`signOut`) очищает сессию Supabase. Серверные тренировки
остаются и снова станут видны после входа тем же пользователем. Если Supabase
недоступен, выход показывает inline-ошибку, а сессия не считается завершённой.

## 5. Где хранятся данные и как проверить

Основное хранилище — таблица `public.workouts` в Postgres Supabase. Доступ —
через `src/store`, клиент Supabase создаётся один раз в `src/store/supabase.ts`.

| Ключ / место | Содержимое |
|---|---|
| `public.workouts` | все тренировки; RLS показывает пользователю только его строки |
| `workout-tracker-data` | **legacy**: старый массив тренировок в `localStorage`; приложением не читается и не изменяется |
| `sb-...-auth-token` | сессия Supabase; ключ и формат — внутренние для SDK |
| `workout-tracker-session` | устаревший mock-ключ; приложением не читается |

**Проверка через Supabase:** Dashboard → Table Editor → `public.workouts` или
SQL Editor:

```sql
select id, user_id, date, time, comment, created_at
from public.workouts
order by date desc, time desc;
```

**Проверка legacy-данных через DevTools:** Application → Local Storage →
`http://localhost:3000`. Ключ `workout-tracker-data` может остаться от прошлых
этапов; приложение его не трогает.

**Сброс serverных данных:** удаление тренировки в UI. Массовая очистка — только
вручную в SQL Editor с учётом RLS/владельца.

**Legacy-скрипты:** `scripts/seed.js` и `seeds.html` пишут старый ключ
`workout-tracker-data`. После перехода на сервер они не влияют на приложение.

## 6. Известные особенности

1. **Дата в UTC, время локальное.** `toISOString()` даёт UTC-дату,
   `toTimeString()` — локальное время. В UTC+3 около полуночи дата может
   отставать на день.
2. **Нет версии схемы.** Изменение структуры требует ручной миграции.
3. **Старые локальные записи не импортируются.** `workout-tracker-data` остаётся
   в браузере, но новый store его не читает. Автоматического переноса нет.
4. **Валидация формы только в UI.** Store сохранит `reps: 0` или пустой
   `results`, если это проходит ограничения БД; форму вложенных объектов БД
   не проверяет.
5. **Ограничение размера `comment`** — 500 символов, проверяется БД. В UI поля
   комментария пока нет.
6. **`generateId` не криптостойкий** (`Date.now()` + `Math.random()`); коллизия
   теперь не проглатывается, а возвращается как `duplicate_id`.
7. **Старые mock-идентификаторы не мигрируют.** Записи с `userId` вида `user-...`
   не являются UUID и не подходят для `user_id uuid`.
8. **Сессия Supabase — не пароль.** SDK хранит access/refresh-токены и обновляет
   их сам. Приложение эти значения не читает и не логирует.
9. **Порядок строк БД не гарантирован.** История и «Последняя тренировка»
   сортируются явно по `date`, затем `time`.

## 7. Серверный этап (Supabase)

Схема и политики — `supabase-workouts.sql`. Таблица одна, `public.workouts`;
вложенность `ExerciseResult → Approach` сохраняется внутри `results jsonb`,
отдельных таблиц нет.

### 7.1 Таблица и отображение на типы

| Колонка | Тип | NULL | По умолчанию | В `Workout` |
|---|---|---|---|---|
| `id` | `text` | нет | — | `id` |
| `user_id` | `uuid` | нет | `auth.uid()` | `userId` |
| `date` | `date` | нет | — | `date` (`YYYY-MM-DD`) |
| `time` | `text` | нет | — | `time` (`HH:MM`) |
| `results` | `jsonb` | нет | — | `results` (`ExerciseResult[]`) |
| `comment` | `text` | да | — | `comment?: string` |
| `created_at` | `timestamptz` | нет | `now()` | `createdAt?: string` (read-only) |

Явное преобразование выполняется только в `src/store/workouts.ts`:

| Приложение | БД | В БД | Из БД |
|---|---|---|---|
| `id` | `id` | `id` | `id` |
| `userId` | `user_id` | `user_id: workout.userId` | `userId: row.user_id` |
| `date` | `date` | строка как есть | строка как есть |
| `time` | `time` | строка как есть | строка как есть |
| `results` | `results` | массив без `JSON.stringify` | распарсенный массив |
| `comment` | `comment` | `workout.comment ?? null` | `row.comment ?? undefined` |
| `createdAt` | `created_at` | не отправляется | `createdAt: row.created_at` |

Компоненты не получают сырые строки БД: `fromWorkoutRow` переводит `snake_case`
в `camelCase`, `toWorkoutInsert` / `toWorkoutUpdate` — обратно.

Ограничения:

- `workouts_results_is_array` — `jsonb_typeof(results) = 'array'`; форму вложенных
  объектов (`exerciseKey`, `approaches`, `reps ≥ 1`) БД не проверяет.
- `workouts_comment_max_length` — `char_length(comment) ≤ 500`; `NULL` допустим,
  пустая строка тоже.
- `PRIMARY KEY (id)` — уникальность строковых ID гарантирует БД.
- FK `user_id → auth.users(id) on delete cascade` — удаление пользователя удаляет
  его тренировки.
- Индекс `workouts_user_id_idx (user_id)`.

### 7.2 RLS и политики

RLS включён. Политики — только для `authenticated`, по одной на команду:

| Команда | Проверка |
|---|---|
| `SELECT` | `USING auth.uid() = user_id` |
| `INSERT` | `WITH CHECK auth.uid() = user_id`; без `user_id` срабатывает `default auth.uid()` |
| `UPDATE` | `USING auth.uid() = user_id` **и** `WITH CHECK auth.uid() = user_id` |
| `DELETE` | `USING auth.uid() = user_id` |

- `USING` у `UPDATE` выбирает строки, которые можно менять; `WITH CHECK` проверяет
  результат, поэтому переписать `user_id` на чужой или `NULL` нельзя.
- `anon` не имеет `GRANT` на таблицу и не попадает ни в одну политику.
- `service_role` и владелец таблицы обходят RLS; ключ `service_role` в браузер
  не попадает.

### 7.3 Существующие локальные записи

`workout-tracker-data` остаётся как есть. `workout-tracker-session` — устаревший
mock-ключ: приложение его не читает и не считает сессией.

- Старые mock-`userId` не являются UUID и не пройдут FK `auth.users`.
- Записи без `userId` нельзя вставить без владельца: колонка `NOT NULL`.
- `getUnownedCount` и `claimUnowned` удалены вместе с `LegacyDataNotice`:
  автоматический перенос и изменение старых записей противоречат решению.
- Перенос — отдельная задача с явным подтверждением пользователя: определить
  владельца (`auth.uid()`), проверить конфликты `id`, вставлять только выбранные
  записи.
- До переноса локальные записи остаются в браузере и новому store не видны.

### 7.4 Store на серверном этапе

- Все методы асинхронные (`Promise`) и возвращают `WorkoutResult`.
- Клиент Supabase создаётся только в `src/store/supabase.ts`; компоненты не
  импортируют `@supabase/supabase-js`.
- `getAll` / `getLast` фильтруют по `user_id` и сортируют по `date` + `time`.
- `add` передаёт `user_id`; `update` / `remove` работают по `id`; владельца
  проверяет RLS, а не клиент.
- Ошибки RLS (`42501`), нарушения CHECK (`23514`) и конфликты `id` (`23505`)
  показываются inline, без `alert` / `confirm`.
- При ошибке сети или сервера данные не подменяются локальными.
