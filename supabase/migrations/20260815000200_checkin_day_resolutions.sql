/*
======================================================
20260815000200_checkin_day_resolutions.sql

Purpose:
  Records an explicit "I don't have this data"
  resolution for a missing Daily Check-In without
  fabricating a Daily Check-In row.

Notes:
  - The original Daily date remains missing.
  - A resolution can only say the data is unavailable.
  - Catch-up UI/rules decide whether the week is still
    open before writing the resolution.
  - One resolution may exist per plan/check-in date.
======================================================
*/

create table if not exists public.checkin_day_resolutions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  coaching_plan_id uuid not null
    references public.coaching_plans(id)
    on delete cascade,

  checkin_date date not null,
  review_date date not null,

  resolution text not null
    default 'unavailable',

  resolved_at timestamptz not null
    default now(),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint checkin_day_resolutions_plan_date_unique
    unique (coaching_plan_id, checkin_date),

  constraint checkin_day_resolutions_resolution_valid
    check (resolution in ('unavailable')),

  constraint checkin_day_resolutions_review_date_valid
    check (review_date = checkin_date - 1)
);

create index if not exists
  checkin_day_resolutions_user_idx
on public.checkin_day_resolutions(user_id);

alter table public.checkin_day_resolutions
  enable row level security;

drop policy if exists
  "Users can read their check-in day resolutions"
on public.checkin_day_resolutions;

create policy
  "Users can read their check-in day resolutions"
on public.checkin_day_resolutions
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.coaching_plans plan
    where plan.id = coaching_plan_id
      and plan.user_id = auth.uid()
  )
);

drop policy if exists
  "Users can insert their check-in day resolutions"
on public.checkin_day_resolutions;

create policy
  "Users can insert their check-in day resolutions"
on public.checkin_day_resolutions
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.coaching_plans plan
    where plan.id = coaching_plan_id
      and plan.user_id = auth.uid()
  )
);

drop policy if exists
  "Users can update their check-in day resolutions"
on public.checkin_day_resolutions;

create policy
  "Users can update their check-in day resolutions"
on public.checkin_day_resolutions
for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.coaching_plans plan
    where plan.id = coaching_plan_id
      and plan.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.coaching_plans plan
    where plan.id = coaching_plan_id
      and plan.user_id = auth.uid()
  )
);

drop policy if exists
  "Users can delete their check-in day resolutions"
on public.checkin_day_resolutions;

create policy
  "Users can delete their check-in day resolutions"
on public.checkin_day_resolutions
for delete
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.coaching_plans plan
    where plan.id = coaching_plan_id
      and plan.user_id = auth.uid()
  )
);

/* Data API grants */
grant select, insert, update, delete
on table public.checkin_day_resolutions
to authenticated;
