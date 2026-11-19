# Модель данных — Workout Tracker

Актуально на 2026-11-12. Источник истины — `workout-tracker/src/types/index.ts` и
`workout-tracker/src/store/index.ts`. При расхождении прав код, затем этот файл.

## 1. Сущности и поля

### Workout — тренировка (корневая сущность)

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `id` | `string` | да | `generateId()`; предполагается уникальным, не проверяется |
| `userId` | `string` | нет | владелец. Отсутствует только у записей, созданных до появления аккаунтов |
| `date` | `string` | да | `YYYY-MM-DD`, берётся из `toISOString()` → **UTC** |
| `time` | `string` | да | `HH:MM`, локальное время (`toTimeString()`) |
| `results` | `ExerciseResult[]` | да | может быть пустым — рантайм не проверяет |

`OwnedWorkout = Workout & { userId: string }` — тип для новых записей. `store.add` принимает
только его и возвращает `false`, если `userId` пустой.

### ExerciseResult — результат по одному упражнению

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `exerciseKey` | `ExerciseKey` | да | ссылка на справочник `EXERCISES` |
| `approaches` | `Approach[]` | да | может быть пустым |

Из UI всегда создаётся ровно один `ExerciseResult` (одна тренировка = одно упражнение).
Несколько результатов в одной записи умеет только `scripts/seed.js`.

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

В тренировке хранится только `key`. Переименование упражнения в коде не меняет старые записи.

### DemoUser — учебный аккаунт (в localStorage не хранится)

`src/auth/demoUsers.ts`, константа `DEMO_USERS`, два пользователя. Поля: `id`, `name`, `email`,
`password`. Пароли лежат в исходниках намеренно — это mock-вход, не безопасность.

### Session — текущая сессия

`{ userId: string }`, отдельный ключ. Хранит только идентификатор, не профиль.

## 2. Связи

```
DemoUser (код)
   │ 1
   │ N            userId — мягкая ссылка, не FK
Workout ──── 1:N ──── ExerciseResult ──── 1:N ──── Approach
   │                        │
   │                        └── exerciseKey ──▶ Exercise (код, справочник)
   │
   └── агрегат: results и approaches вложены, отдельных таблиц нет
```

- **`Workout` — корень агрегата.** `results` и `approaches` принадлежат только ему и ни с чем
  не разделяются.
- **Связь с пользователем — по значению `userId`**, без каскадов и без проверки существования
  пользователя. Если `userId` не совпадает ни с одним `DemoUser`, запись просто не видна.
- **Связь с упражнением — по `exerciseKey`**, справочник в коде, а не в данных.

## 3. Обязательные значения и где они проверяются

| Правило | Где проверяется |
|---|---|
| `userId` заполнен у новой записи | `store.add` → `false` без владельца |
| `reps ≥ 1` | только UI: `InputScreen.handleSave` |
| `extraWeightKg = 0` при `hasExtraWeight = false` | только UI: `InputScreen.handleApproachChange` |
| `exerciseKey` ∈ 4 значений | только типы TypeScript |
| `date` / `time` в нужном формате | нигде, соглашение |
| `id` уникален | нигде, предполагается |
| один `ExerciseResult` на упражнение в тренировке | нигде (соблюдается в `seed.js` через `Set`) |

Store не валидирует входные данные — он доверяет типам. Всё, что пришло в обход UI, сохранится как есть.

## 4. Изменение и удаление

| Операция | Поведение |
|---|---|
| `store.add(workout)` | push в общий массив; `false`, если нет `userId` |
| `store.update(workout, userId)` | поиск по `id`, проверка владельца, **замена объекта целиком**; `false`, если не найдено или чужое. В UI не используется |
| `store.remove(id, userId)` | поиск по `id`, проверка владельца, `splice`; `false`, если не найдено или чужое |
| `store.claimUnowned(userId)` | одноразово проставляет `userId` всем записям без владельца; возвращает количество. Повторный вызов → `0` |
| `store.getUnownedCount()` | сколько записей без владельца |
| `store.getAll(userId)` | только записи этого пользователя, в порядке вставки |
| `store.getLast(userId)` | записи пользователя, сортировка по `date`+`time` по убыванию, берётся первая |

**Каскадов нет и не нужно:** подходы и результаты вложены в тренировку и удаляются вместе с ней.
Удаление тренировки не затрагивает другие записи.

**Чужие данные:** `getAll`, `getLast`, `update`, `remove` фильтруют по `userId` внутри store, а не
только в UI. Но `userId` приходит с клиента — в реальном бэкенде проверка обязана быть на сервере.

**Выход из аккаунта** (`signOut`) удаляет только сессию. Данные остаются в localStorage и снова
станут видны после входа тем же пользователем.

## 5. Где хранятся данные и как проверить

Оба ключа — в `localStorage`, origin `http://localhost:3000`.

| Ключ | Содержимое |
|---|---|
| `workout-tracker-data` | JSON-массив `Workout` **всех пользователей вместе** |
| `workout-tracker-session` | `{ "userId": "user-anna" }` |

**Проверка через DevTools:** Application → Local Storage → `http://localhost:3000`.

**Проверка через консоль:**

```js
// все записи
JSON.parse(localStorage.getItem('workout-tracker-data'))

// только мои
const me = JSON.parse(localStorage.getItem('workout-tracker-session')).userId
JSON.parse(localStorage.getItem('workout-tracker-data')).filter(w => w.userId === me)

// записи без владельца
JSON.parse(localStorage.getItem('workout-tracker-data')).filter(w => !w.userId).length
```

**Демо-данные:** `node workout-tracker/scripts/seed.js` печатает сниппет для консоли.
Он создаёт записи **без `userId`** — они не видны ни одному пользователю, пока не сработает
`LegacyDataNotice` на главном экране (перенос старых записей в текущий аккаунт).

**Сброс:**

```js
localStorage.removeItem('workout-tracker-data')   // все тренировки
localStorage.removeItem('workout-tracker-session') // выход из аккаунта
```

## 6. Известные особенности

1. **Дата в UTC, время локальное.** `toISOString()` даёт UTC-дату, `toTimeString()` — локальное
   время. В UTC+3 около полуночи дата может отставать на день.
2. **Нет версии схемы.** Изменение структуры требует ручной миграции; признак старого формата —
   отсутствие `userId`, он обрабатывается явно через `claimUnowned`.
3. **Битый JSON теряется молча.** `loadData` при ошибке парсинга возвращает `[]`, и следующая
   запись перезапишет испорченные данные.
4. **Валидация только в UI.** Store сохранит `reps: 0`, пустой `results`, неизвестный
   `exerciseKey` — UI потом покажет пустое название упражнения.
5. **Лимит localStorage** ~5 МБ на origin; при переполнении `setItem` бросит исключение,
   обработки нет.
6. **`generateId` не криптостойкий** (`Date.now()` + `Math.random()`); коллизии теоретически
   возможны, проверки уникальности нет.
