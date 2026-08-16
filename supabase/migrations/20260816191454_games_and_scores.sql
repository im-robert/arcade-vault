-- supabase/migrations/xxxx_games_and_scores.sql

create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,
  cover text not null,
  color text not null
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  player_name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_public_read" on public.games
  for select using (true);

create policy "scores_public_read" on public.scores
  for select using (true);

create policy "scores_public_insert" on public.scores
  for insert with check (true);

insert into public.games (id, title, short, long, cat, cover, color) values
('bloque-buster', 'BLOQUE BUSTER', 'Rebota la pelota y destruye muros de neón.', 'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?', 'ARCADE', 'cover-bricks', 'cyan'),
('caida', 'CAÍDA', 'Encaja las piezas antes de que el techo te aplaste.', 'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.', 'PUZZLE', 'cover-tetro', 'magenta'),
('serpentina', 'SERPENTINA', 'Crece sin morder tu propia cola.', 'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.', 'ARCADE', 'cover-snake', 'green'),
('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.', 'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.', 'ARCADE', 'cover-glot', 'yellow'),
('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.', 'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.', 'SHOOTER', 'cover-invaders', 'green'),
('asteroids', 'ASTEROIDS', 'Pulveriza asteroides en gravedad cero.', 'Tu nave triangular flota en el vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Sobrevive oleada tras oleada y persigue el power-up de disparo triple.', 'SHOOTER', 'cover-rocas', 'yellow'),
('ranaria', 'RANARIA', 'Cruza la autopista de pixeles.', 'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.', 'ARCADE', 'cover-rana', 'green'),
('duelo-pixel', 'DUELO PIXEL', 'Dos paletas. Una pelota. Reflejos máximos.', 'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.', 'VERSUS', 'cover-duelo', 'cyan');

insert into public.scores (game_id, player_name, score, created_at) values
('bloque-buster', 'NEONFOX', 28450, '2026-08-01 10:12:00+00'),
('bloque-buster', 'PX_KAI', 26120, '2026-07-28 14:05:00+00'),
('bloque-buster', 'GLITCHA', 24310, '2026-07-20 09:40:00+00'),
('bloque-buster', 'Z3R0COOL', 21890, '2026-07-12 18:22:00+00'),
('bloque-buster', 'VAULT_07', 19560, '2026-06-30 11:15:00+00'),
('bloque-buster', 'M00NRYU', 17240, '2026-06-18 20:03:00+00'),
('bloque-buster', 'CYBER_LU', 15100, '2026-06-02 08:47:00+00'),
('bloque-buster', 'ARKADYA', 12980, '2026-05-21 16:30:00+00'),
('bloque-buster', 'SCANLINE', 10450, '2026-05-05 13:11:00+00'),
('bloque-buster', 'DROID_X', 8200, '2026-04-19 07:55:00+00'),

('caida', 'NEONFOX', 184220, '2026-08-05 12:00:00+00'),
('caida', 'M00NRYU', 162300, '2026-07-30 09:18:00+00'),
('caida', 'PX_KAI', 148900, '2026-07-22 21:44:00+00'),
('caida', 'RGB_QUEEN', 131500, '2026-07-10 15:26:00+00'),
('caida', 'VECTORX', 112700, '2026-06-27 10:09:00+00'),
('caida', 'BIT_LORD', 98400, '2026-06-14 19:33:00+00'),
('caida', 'ATARI_KID', 84200, '2026-05-29 08:12:00+00'),
('caida', 'JOY_STK', 69800, '2026-05-14 17:47:00+00'),
('caida', 'RETROVIRA', 54600, '2026-04-30 12:05:00+00'),
('caida', 'MAGENTA88', 41200, '2026-04-11 06:58:00+00'),

('serpentina', 'ARKADYA', 7820, '2026-08-03 08:20:00+00'),
('serpentina', 'GLITCHA', 7100, '2026-07-26 13:55:00+00'),
('serpentina', 'CYBER_LU', 6480, '2026-07-15 19:10:00+00'),
('serpentina', 'PIXEL_DAD', 5900, '2026-07-01 09:44:00+00'),
('serpentina', 'DROID_X', 5210, '2026-06-19 14:27:00+00'),
('serpentina', 'SCANLINE', 4680, '2026-06-05 11:02:00+00'),
('serpentina', 'VAULT_07', 4020, '2026-05-22 20:15:00+00'),
('serpentina', 'BIT_LORD', 3350, '2026-05-08 07:39:00+00'),
('serpentina', 'RETROVIRA', 2700, '2026-04-24 16:48:00+00'),
('serpentina', 'JOY_STK', 2100, '2026-04-09 10:31:00+00'),

('gloton', 'PX_KAI', 96400, '2026-08-06 09:05:00+00'),
('gloton', 'Z3R0COOL', 88200, '2026-07-29 15:40:00+00'),
('gloton', 'NEONFOX', 79500, '2026-07-18 11:22:00+00'),
('gloton', 'M00NRYU', 71300, '2026-07-04 20:07:00+00'),
('gloton', 'ATARI_KID', 63100, '2026-06-22 13:51:00+00'),
('gloton', 'RGB_QUEEN', 55400, '2026-06-09 08:36:00+00'),
('gloton', 'VECTORX', 47800, '2026-05-27 17:14:00+00'),
('gloton', 'MAGENTA88', 40200, '2026-05-12 12:59:00+00'),
('gloton', 'CYBER_LU', 32900, '2026-04-28 06:41:00+00'),
('gloton', 'BIT_LORD', 25600, '2026-04-14 19:23:00+00'),

('invasores', 'Z3R0COOL', 54190, '2026-08-04 14:18:00+00'),
('invasores', 'VAULT_07', 49800, '2026-07-27 10:53:00+00'),
('invasores', 'GLITCHA', 45100, '2026-07-16 18:29:00+00'),
('invasores', 'ARKADYA', 40600, '2026-07-02 09:16:00+00'),
('invasores', 'DROID_X', 36200, '2026-06-20 15:44:00+00'),
('invasores', 'PIXEL_DAD', 31900, '2026-06-06 21:08:00+00'),
('invasores', 'SCANLINE', 27500, '2026-05-24 12:37:00+00'),
('invasores', 'RETROVIRA', 23100, '2026-05-09 08:52:00+00'),
('invasores', 'JOY_STK', 18700, '2026-04-26 16:19:00+00'),
('invasores', 'BIT_LORD', 14300, '2026-04-11 11:05:00+00'),

('asteroids', 'VAULT_07', 38200, '2026-08-07 11:30:00+00'),
('asteroids', 'NEONFOX', 34900, '2026-07-31 16:12:00+00'),
('asteroids', 'PX_KAI', 31200, '2026-07-19 09:47:00+00'),
('asteroids', 'CYBER_LU', 27800, '2026-07-05 20:24:00+00'),
('asteroids', 'M00NRYU', 24100, '2026-06-23 13:09:00+00'),
('asteroids', 'RGB_QUEEN', 20500, '2026-06-10 07:53:00+00'),
('asteroids', 'ATARI_KID', 17200, '2026-05-28 18:41:00+00'),
('asteroids', 'MAGENTA88', 13800, '2026-05-13 12:16:00+00'),
('asteroids', 'VECTORX', 10400, '2026-04-29 09:38:00+00'),
('asteroids', 'GLITCHA', 7100, '2026-04-15 15:52:00+00'),

('ranaria', 'CYBER_LU', 18900, '2026-08-02 07:41:00+00'),
('ranaria', 'ARKADYA', 16700, '2026-07-25 12:58:00+00'),
('ranaria', 'DROID_X', 14500, '2026-07-13 19:36:00+00'),
('ranaria', 'PIXEL_DAD', 12300, '2026-06-29 10:21:00+00'),
('ranaria', 'SCANLINE', 10100, '2026-06-16 16:47:00+00'),
('ranaria', 'BIT_LORD', 8400, '2026-06-01 08:14:00+00'),
('ranaria', 'JOY_STK', 6700, '2026-05-19 13:29:00+00'),
('ranaria', 'RETROVIRA', 5200, '2026-05-04 19:55:00+00'),
('ranaria', 'VECTORX', 3800, '2026-04-20 11:42:00+00'),
('ranaria', 'MAGENTA88', 2500, '2026-04-06 06:33:00+00'),

('duelo-pixel', 'GLITCHA', 24, '2026-08-08 15:22:00+00'),
('duelo-pixel', 'M00NRYU', 21, '2026-07-24 10:04:00+00'),
('duelo-pixel', 'VAULT_07', 19, '2026-07-11 17:48:00+00'),
('duelo-pixel', 'ATARI_KID', 17, '2026-06-28 09:11:00+00'),
('duelo-pixel', 'RGB_QUEEN', 15, '2026-06-13 14:39:00+00'),
('duelo-pixel', 'Z3R0COOL', 13, '2026-05-30 20:57:00+00'),
('duelo-pixel', 'PX_KAI', 11, '2026-05-16 12:24:00+00'),
('duelo-pixel', 'NEONFOX', 9, '2026-05-01 18:06:00+00'),
('duelo-pixel', 'JOY_STK', 7, '2026-04-17 08:49:00+00'),
('duelo-pixel', 'PIXEL_DAD', 5, '2026-04-03 21:15:00+00');
