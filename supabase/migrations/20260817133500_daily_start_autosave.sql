/*
======================================================
20260817133500_daily_start_autosave.sql

Purpose:
  Add safe draft/resume persistence for Daily and
  Start Check-Ins.

Design:
  - Daily partial answers live in a SEPARATE draft
    table. This prevents an autosaved partial Daily
    from being counted as a completed Daily by the
    dashboard, streak, history, Plan Progress, or
    Weekly preflight.
  - Start Check-In already has draft/completed status,
    so exact wizard state and resume location live on
    its existing draft row.
======================================================
*/

create table if not exists public.daily_checkin_drafts (
    id uuid primary key default gen_random_uuid(),

    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    checkin_date date not null,

    draft_data jsonb not null
        default '{}'::jsonb,

    resume_step text,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint daily_checkin_drafts_plan_date_unique
        unique (coaching_plan_id, checkin_date)
);

alter table public.daily_checkin_drafts
    enable row level security;

create policy "Users can view their own Daily drafts"
on public.daily_checkin_drafts
for select
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            daily_checkin_drafts.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

create policy "Users can create their own Daily drafts"
on public.daily_checkin_drafts
for insert
to authenticated
with check (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            daily_checkin_drafts.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

create policy "Users can update their own Daily drafts"
on public.daily_checkin_drafts
for update
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            daily_checkin_drafts.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            daily_checkin_drafts.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

create policy "Users can delete their own Daily drafts"
on public.daily_checkin_drafts
for delete
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            daily_checkin_drafts.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

create trigger daily_checkin_drafts_set_updated_at
before update on public.daily_checkin_drafts
for each row
execute function public.set_updated_at();

grant select, insert, update, delete
on table public.daily_checkin_drafts
to authenticated;

comment on table public.daily_checkin_drafts
is 'Autosaved in-progress Daily wizard state. A draft is not a completed Daily Check-In.';

alter table public.start_checkins
    add column if not exists
        draft_data jsonb not null
        default '{}'::jsonb;

alter table public.start_checkins
    add column if not exists
        resume_step text;

comment on column public.start_checkins.draft_data
is 'Exact autosaved Start Check-In wizard form while status is draft.';

comment on column public.start_checkins.resume_step
is 'Wizard step where an incomplete Start Check-In should resume.';
