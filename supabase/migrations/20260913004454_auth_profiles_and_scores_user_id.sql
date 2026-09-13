-- Nueva tabla: perfil propio, 1:1 con auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Sin policy de insert/update público: solo el trigger (security definer) escribe aquí.

-- Trigger: crea el profile automáticamente al registrarse
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- scores: se agrega vínculo opcional a la cuenta real, sin tocar player_name
alter table public.scores add column user_id uuid references auth.users(id) on delete set null;
