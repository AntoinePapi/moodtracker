-- Bound what one account can store, so a single user can't fill the database.

alter table public.entries
  add constraint entries_theme check (theme_id in ('reves', 'stress', 'mood', 'cycle', 'pas', 'ecran')),
  add constraint entries_v check (v between 0 and 5),
  add constraint entries_n check (n between 0 and 100000),
  add constraint entries_note check (char_length(note) <= 2000),
  add constraint entries_day check (day >= date '2020-01-01');

alter table public.bonheurs
  add constraint bonheurs_text check (char_length(text) between 1 and 500),
  add constraint bonheurs_day check (day >= date '2020-01-01');

-- no future days (one day of slack for time zones ahead of UTC)
create function public.reject_future_day()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.day > current_date + 1 then
    raise exception 'day % is in the future', new.day using errcode = '22008';
  end if;
  return new;
end;
$$;

create trigger entries_no_future before insert or update on public.entries
  for each row execute function public.reject_future_day();

create trigger bonheurs_no_future before insert or update on public.bonheurs
  for each row execute function public.reject_future_day();
