-- Workout Tracker — серверная схема для нового пустого проекта Supabase.
--
-- Как применить: Dashboard → SQL Editor → New query → вставить файл целиком → Run.
-- Скрипт выполняется одной транзакцией: при ошибке не применяется ничего.
-- Повторный запуск на уже настроенной базе завершится ошибкой (объекты уже существуют).
--
-- Локальные данные из localStorage этот скрипт не читает, не удаляет и не переносит.

begin;

create table public.workouts (
  id         text        primary key,
  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,
  date       date        not null,
  time       text        not null,
  results    jsonb       not null,
  comment    text,
  created_at timestamptz not null default now(),

  constraint workouts_results_is_array
    check (jsonb_typeof(results) = 'array'),
  constraint workouts_comment_max_length
    check (comment is null or char_length(comment) <= 500)
);

create index workouts_user_id_idx on public.workouts (user_id);

alter table public.workouts enable row level security;

-- anon не должен иметь даже прав на таблицу; authenticated работает через RLS.
revoke all on table public.workouts from anon;
grant select, insert, update, delete on table public.workouts to authenticated;

-- Чтение: только свои строки.
create policy "workouts_select_own"
  on public.workouts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Вставка: user_id новой строки должен совпадать с текущим пользователем.
-- Если клиент не передал user_id, сработает default auth.uid().
create policy "workouts_insert_own"
  on public.workouts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Обновление: USING ограничивает выбираемые строки, WITH CHECK проверяет
-- строку после изменения — переписать user_id на чужой или NULL нельзя.
create policy "workouts_update_own"
  on public.workouts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Удаление: только свои строки.
create policy "workouts_delete_own"
  on public.workouts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
