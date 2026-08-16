-- Elimina las puntuaciones de relleno sembradas en la migración anterior.
-- El leaderboard y el salón de la fama ahora muestran un estado vacío
-- ("sé el primero") en vez de datos de ejemplo cuando no hay partidas reales.

delete from public.scores;
