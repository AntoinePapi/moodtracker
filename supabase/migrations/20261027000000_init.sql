-- One row per (user, calendar, day). "Mon année en pixels" is computed client-side, never stored.
create table public.entries (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  theme_id text not null,
  day date not null,
  v smallint,
  n integer,
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, theme_id, day)
);

create table public.bonheurs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  text text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.entries enable row level security;
alter table public.bonheurs enable row level security;

-- everyone only ever sees and touches their own rows
create policy "own entries" on public.entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own bonheurs" on public.bonheurs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- "Supprimer mon compte": removes the auth user, rows go with it (on delete cascade)
create function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
