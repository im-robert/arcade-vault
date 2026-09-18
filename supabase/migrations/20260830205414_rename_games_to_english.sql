-- Backfill: esta migración ya está aplicada en dev (registrada en
-- supabase_migrations.schema_migrations con este mismo version/name) pero
-- nunca existió como archivo en el repo. Se recupera textual para que
-- supabase/migrations/ describa el estado real de dev y sea reproducible
-- en un proyecto nuevo (prod).
update public.games set title = 'ARKANOID'   where id = 'bloque-buster';
update public.games set title = 'TETRIS'     where id = 'caida';
update public.games set title = 'PIXEL DUEL' where id = 'duelo-pixel';
update public.games set title = 'GLUTTON'    where id = 'gloton';
update public.games set title = 'INVADERS'   where id = 'invasores';
update public.games set title = 'FROG'       where id = 'ranaria';
update public.games set title = 'SNAKE'      where id = 'serpentina';
