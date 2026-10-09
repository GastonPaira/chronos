-- 003 · Ajustes de seguridad del modo versus
-- Correr en Supabase Dashboard > SQL Editor. Se puede correr más de una vez.
--
-- Revisado contra las políticas actuales (9 oct 2026). Las del versus ya exigen usuario logueado;
-- estos son los tres huecos que quedaban:
--
-- 1. matches_update solo dejaba actualizar al creador. Cuando el amigo se une, la app pone la partida
--    en 'playing', y si el amigo termina último la pone en 'finished': esas dos escrituras fallaban en silencio.
-- 2. Quien todavía no juega en una partida no puede ver sus jugadores (RLS), así que el chequeo
--    "partida llena" de la app siempre veía 0 jugadores: un tercero podía sumarse. Ahora lo controla la base.
-- 3. profiles_select era público: cualquiera sin cuenta podía leer nombres y fotos. Ahora solo usuarios logueados.
--
-- Además se borran auth_user_stats / auth_user_streak, que quedaron duplicadas con las de 002.

begin;

-- Cuántos jugadores tiene una partida (security definer: cuenta aunque RLS no deje verlos).
create or replace function public.match_player_count(p_match_id text)
returns integer language sql security definer stable set search_path = public as $$
  select count(*)::int from public.match_players where match_id::text = p_match_id;
$$;

-- ¿El usuario actual juega en esta partida?
create or replace function public.is_match_player(p_match_id text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.match_players
    where match_id::text = p_match_id and user_id::text = auth.uid()::text
  );
$$;

-- 1. Los jugadores de la partida pueden cambiar su estado.
drop policy if exists "matches_update" on public.matches;
create policy "matches_update" on public.matches for update to authenticated
  using (public.is_match_player(id::text)) with check (public.is_match_player(id::text));

-- 2. Sumarse solo con la propia cuenta y solo si hay lugar (máximo 2 jugadores).
drop policy if exists "match_players_insert" on public.match_players;
create policy "match_players_insert" on public.match_players for insert to authenticated
  with check (user_id::text = auth.uid()::text and public.match_player_count(match_id::text) < 2);

-- 3. Perfiles: solo para usuarios logueados.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (true);

-- Duplicadas con 002.
drop policy if exists "auth_user_stats" on public.user_stats;
drop policy if exists "auth_user_streak" on public.user_streak;

commit;
