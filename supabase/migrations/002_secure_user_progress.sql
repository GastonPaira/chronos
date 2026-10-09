-- 002 · Progreso privado por usuario (estadísticas y racha)
-- Correr en Supabase Dashboard > SQL Editor.
--
-- Antes: las políticas "anon_all" (USING true) dejaban que cualquiera, con la clave pública
-- que está en el frontend, leyera y modificara las filas de TODOS los jugadores.
-- Ahora: los jugadores sin cuenta guardan su progreso en el dispositivo (localStorage),
-- y en Supabase cada usuario logueado solo puede ver y tocar su propia fila.

begin;

-- 1. Sacar las políticas abiertas.
drop policy if exists "anon_all" on public.user_stats;
drop policy if exists "anon_all" on public.user_streak;

-- 2. Asegurar la columna user_id con un índice único (la app hace upsert por user_id).
alter table public.user_stats  add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.user_streak add column if not exists user_id uuid references auth.users (id) on delete cascade;
create unique index if not exists user_stats_user_id_key  on public.user_stats  (user_id);
create unique index if not exists user_streak_user_id_key on public.user_streak (user_id);

-- 3. device_id ya no es la clave: las filas nuevas solo tienen user_id.
--    Si device_id sigue siendo PRIMARY KEY (como en 001), se saca esa restricción.
do $$
declare
  t text;
  pk text;
begin
  foreach t in array array['user_stats', 'user_streak'] loop
    select tc.constraint_name into pk
    from information_schema.table_constraints tc
    join information_schema.key_column_usage k
      on k.constraint_name = tc.constraint_name and k.table_schema = tc.table_schema and k.table_name = tc.table_name
    where tc.table_schema = 'public' and tc.table_name = t
      and tc.constraint_type = 'PRIMARY KEY' and k.column_name = 'device_id';
    if pk is not null then
      execute format('alter table public.%I drop constraint %I', t, pk);
    end if;
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = t and column_name = 'device_id') then
      execute format('alter table public.%I alter column device_id drop not null', t);
    end if;
  end loop;
end $$;

alter table public.user_stats  enable row level security;
alter table public.user_streak enable row level security;

-- 4. Cada usuario autenticado, solo su fila.
drop policy if exists "own_stats_select" on public.user_stats;
create policy "own_stats_select" on public.user_stats for select to authenticated using (auth.uid()::text = user_id::text);
drop policy if exists "own_stats_insert" on public.user_stats;
create policy "own_stats_insert" on public.user_stats for insert to authenticated with check (auth.uid()::text = user_id::text);
drop policy if exists "own_stats_update" on public.user_stats;
create policy "own_stats_update" on public.user_stats for update to authenticated using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
drop policy if exists "own_stats_delete" on public.user_stats;
create policy "own_stats_delete" on public.user_stats for delete to authenticated using (auth.uid()::text = user_id::text);

drop policy if exists "own_streak_select" on public.user_streak;
create policy "own_streak_select" on public.user_streak for select to authenticated using (auth.uid()::text = user_id::text);
drop policy if exists "own_streak_insert" on public.user_streak;
create policy "own_streak_insert" on public.user_streak for insert to authenticated with check (auth.uid()::text = user_id::text);
drop policy if exists "own_streak_update" on public.user_streak;
create policy "own_streak_update" on public.user_streak for update to authenticated using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
drop policy if exists "own_streak_delete" on public.user_streak;
create policy "own_streak_delete" on public.user_streak for delete to authenticated using (auth.uid()::text = user_id::text);

commit;

-- Opcional, cuando quieras limpiar: filas viejas de jugadores anónimos que ya nadie puede leer.
-- delete from public.user_stats  where user_id is null;
-- delete from public.user_streak where user_id is null;
