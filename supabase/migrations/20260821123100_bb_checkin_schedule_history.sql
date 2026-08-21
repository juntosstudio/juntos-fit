/*
======================================================
20260821123100_bb_checkin_schedule_history.sql

Purpose:
    Adds append-only, effective-dated Weekly check-in
    day history without pretending undocumented legacy
    changes can be reconstructed.
======================================================
*/

begin;
/******************************************************************************
    4. Effective-dated check-in schedule history
******************************************************************************/

create table if not exists
public.coaching_plan_checkin_schedules (

    id uuid primary key
        default gen_random_uuid(),

    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    checkin_day smallint not null
        check (checkin_day between 0 and 6),

    effective_date date not null,

    source text not null,

    created_at timestamptz not null
        default now(),

    constraint
        coaching_plan_checkin_schedules_source_valid
        check (
            source in (
                'legacy_baseline',
                'plan_created',
                'checkin_day_changed',
                'scheduled_change',
                'admin_override'
            )
        )
);

create index if not exists
    coaching_plan_checkin_schedules_lookup_idx
on public.coaching_plan_checkin_schedules (
    coaching_plan_id,
    effective_date desc,
    created_at desc
);

alter table public.coaching_plan_checkin_schedules
    enable row level security;

create policy
    "Users can view their own check-in schedule history"
on public.coaching_plan_checkin_schedules
for select
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans as plan
        where plan.id = coaching_plan_id
          and plan.user_id =
              (select auth.uid())
    )
);

-- We cannot reconstruct undocumented historical day changes.
-- For currently active legacy plans, record only the schedule known
-- as of this migration. New plans are fully tracked from creation.
insert into public.coaching_plan_checkin_schedules (
    coaching_plan_id,
    checkin_day,
    effective_date,
    source
)
select
    plan.id,
    plan.checkin_day,
    greatest(
        plan.start_date,
        timezone(
            coalesce(plan.time_zone, 'UTC'),
            now()
        )::date
    ),
    'legacy_baseline'
from public.coaching_plans as plan
where plan.status = 'active'
  and not exists (
      select 1
      from public.coaching_plan_checkin_schedules as schedule
      where schedule.coaching_plan_id = plan.id
  );

create or replace function
public.capture_coaching_plan_checkin_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_effective_date date;
begin
    if tg_op = 'INSERT' then
        insert into public.coaching_plan_checkin_schedules (
            coaching_plan_id,
            checkin_day,
            effective_date,
            source
        )
        values (
            new.id,
            new.checkin_day,
            new.start_date,
            'plan_created'
        );

        return new;
    end if;

    if old.checkin_day is distinct from new.checkin_day then
        v_effective_date := greatest(
            new.start_date,
            timezone(
                coalesce(new.time_zone, 'UTC'),
                now()
            )::date
        );

        insert into public.coaching_plan_checkin_schedules (
            coaching_plan_id,
            checkin_day,
            effective_date,
            source
        )
        values (
            new.id,
            new.checkin_day,
            v_effective_date,
            'checkin_day_changed'
        );
    end if;

    return new;
end;
$$;

drop trigger if exists
    coaching_plans_capture_checkin_schedule_insert
on public.coaching_plans;

create trigger
    coaching_plans_capture_checkin_schedule_insert
after insert
on public.coaching_plans
for each row
execute function
    public.capture_coaching_plan_checkin_schedule();

drop trigger if exists
    coaching_plans_capture_checkin_schedule_update
on public.coaching_plans;

create trigger
    coaching_plans_capture_checkin_schedule_update
after update of checkin_day
on public.coaching_plans
for each row
when (old.checkin_day is distinct from new.checkin_day)
execute function
    public.capture_coaching_plan_checkin_schedule();

comment on table
    public.coaching_plan_checkin_schedules
is 'Append-only effective-dated history of the Weekly check-in weekday for a coaching plan. Legacy active plans begin with a migration baseline because undocumented prior changes cannot be reconstructed honestly.';


grant select
on table public.coaching_plan_checkin_schedules
to authenticated;

revoke insert, update, delete
on table public.coaching_plan_checkin_schedules
from authenticated;

revoke all
on table public.coaching_plan_checkin_schedules
from anon;

grant select, insert
on table public.coaching_plan_checkin_schedules
to service_role;

commit;
