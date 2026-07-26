begin;

create table if not exists public.user_settings (
  user_id uuid primary key
    references public.profiles(id)
    on delete cascade,

  track_water boolean not null default true,
  track_alcohol boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings
  enable row level security;

drop policy if exists
  "Users can read their own settings"
  on public.user_settings;

create policy
  "Users can read their own settings"
  on public.user_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists
  "Users can insert their own settings"
  on public.user_settings;

create policy
  "Users can insert their own settings"
  on public.user_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists
  "Users can update their own settings"
  on public.user_settings;

create policy
  "Users can update their own settings"
  on public.user_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update
  on public.user_settings
  to authenticated;

insert into public.user_settings (user_id)
select id
from public.profiles
on conflict (user_id) do nothing;

commit;
