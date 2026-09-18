-- Cierra los 3 hallazgos abiertos en mcp__supabase__get_advisors sobre el
-- esquema de la app (el cuarto, auth_leaked_password_protection, es un
-- ajuste de dashboard/Auth, no de esquema).

-- auth_rls_initplan: auth.uid() se re-evaluaba por fila; se envuelve en un
-- subselect para que el planner lo trate como estable por statement.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);

-- unindexed_foreign_keys: ambos FK de scores sin índice de cobertura.
-- scores_game_id_idx es el que más importa: todos los leaderboards de
-- lib/scores.ts filtran por game_id.
create index if not exists scores_game_id_idx on public.scores (game_id);
create index if not exists scores_user_id_idx on public.scores (user_id);
