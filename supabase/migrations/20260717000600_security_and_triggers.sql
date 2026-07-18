/*
======================================================
006_security_and_triggers.sql

Purpose:
    Defines shared updated_at behavior and Row Level
    Security policies for the core coaching tables.

Relationships:
    Applies security and update triggers to:

        profiles
        coaching_plans
        coaching_plan_targets
        daily_checkins
        weekly_checkins

Notes:
    Authenticated users may access only records that
    belong to their own Supabase Auth user.

    Profiles and check-ins may be created and updated
    by their owner.

    Coaching plans and coaching-plan targets are
    read-only through the authenticated application
    during the initial beta. They are created and
    changed administratively.

    Delete access is not currently exposed through
    the authenticated application.

Author:
    Deborah Reyna

Created:
    2026-07-17

======================================================
*/

/******************************************************************************
    Functions
******************************************************************************/

-- Automatically sets updated_at whenever a row is updated.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();

    return new;
end;
$$;

/******************************************************************************
    Triggers
******************************************************************************/

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger coaching_plans_set_updated_at
before update on public.coaching_plans
for each row
execute function public.set_updated_at();

create trigger coaching_plan_targets_set_updated_at
before update on public.coaching_plan_targets
for each row
execute function public.set_updated_at();

create trigger daily_checkins_set_updated_at
before update on public.daily_checkins
for each row
execute function public.set_updated_at();

create trigger weekly_checkins_set_updated_at
before update on public.weekly_checkins
for each row
execute function public.set_updated_at();

/******************************************************************************
    Row Level Security
******************************************************************************/

alter table public.profiles
    enable row level security;

alter table public.coaching_plans
    enable row level security;

alter table public.coaching_plan_targets
    enable row level security;

alter table public.daily_checkins
    enable row level security;

alter table public.weekly_checkins
    enable row level security;

/******************************************************************************
    Profile Policies
******************************************************************************/

-- Allows an authenticated user to view their own profile.
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (
    (select auth.uid()) = id
);

-- Allows an authenticated user to create their own profile.
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (
    (select auth.uid()) = id
);

-- Allows an authenticated user to update their own profile.
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (
    (select auth.uid()) = id
)
with check (
    (select auth.uid()) = id
);

/******************************************************************************
    Coaching Plan Policies
******************************************************************************/

-- Allows an authenticated user to view coaching plans
-- that belong to their profile.
create policy "Users can view their own coaching plans"
on public.coaching_plans
for select
to authenticated
using (
    user_id = (select auth.uid())
);

/******************************************************************************
    Coaching Plan Target Policies
******************************************************************************/

-- Allows an authenticated user to view targets belonging
-- to one of their coaching plans.
create policy "Users can view their own coaching plan targets"
on public.coaching_plan_targets
for select
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            coaching_plan_targets.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

/******************************************************************************
    Daily Check-In Policies
******************************************************************************/

-- Allows an authenticated user to view daily check-ins
-- belonging to one of their coaching plans.
create policy "Users can view their own daily check-ins"
on public.daily_checkins
for select
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            daily_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

-- Allows an authenticated user to create daily check-ins
-- for one of their coaching plans.
create policy "Users can create their own daily check-ins"
on public.daily_checkins
for insert
to authenticated
with check (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            daily_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

-- Allows an authenticated user to update daily check-ins
-- belonging to one of their coaching plans.
create policy "Users can update their own daily check-ins"
on public.daily_checkins
for update
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            daily_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            daily_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

/******************************************************************************
    Weekly Check-In Policies
******************************************************************************/

-- Allows an authenticated user to view weekly check-ins
-- belonging to one of their coaching plans.
create policy "Users can view their own weekly check-ins"
on public.weekly_checkins
for select
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            weekly_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

-- Allows an authenticated user to create weekly check-ins
-- for one of their coaching plans.
create policy "Users can create their own weekly check-ins"
on public.weekly_checkins
for insert
to authenticated
with check (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            weekly_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

-- Allows an authenticated user to update weekly check-ins
-- belonging to one of their coaching plans.
create policy "Users can update their own weekly check-ins"
on public.weekly_checkins
for update
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            weekly_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            weekly_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);