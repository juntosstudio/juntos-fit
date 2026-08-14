/*
======================================================
20260814000300_weekly_summary_prescriptions.sql

Purpose:
    Preserves the exact plan prescriptions that were
    active during each completed coaching week.

Design:
    coaching_plan_targets remains the canonical,
    versioned target history.

    weekly_plan_prescriptions is an immutable snapshot
    of the target rows that actually overlapped a
    completed Weekly Check-In's program week.

    If a prescription changes mid-week, that Weekly
    Check-In receives more than one snapshot row, each
    with the dates and number of days it applied.

    Existing completed Weekly Check-Ins are backfilled.
======================================================
*/

/******************************************************************************
    Weekly prescription snapshots
******************************************************************************/

create table if not exists
public.weekly_plan_prescriptions (

    id uuid primary key
        default gen_random_uuid(),

    weekly_checkin_id uuid not null
        references public.weekly_checkins(id)
        on delete cascade,

    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    -- Preserved for traceability. Snapshot values below
    -- remain useful even if the source row is later removed.
    source_target_id uuid
        references public.coaching_plan_targets(id)
        on delete set null,

    week_number integer not null,

    effective_from date not null,
    effective_to date not null,

    days_in_effect smallint not null,

    calorie_target smallint,
    protein_grams smallint,
    carb_grams smallint,
    fat_grams smallint,

    weekly_cardio_target_minutes smallint not null
        default 0,

    weekly_workout_target integer,

    daily_water_goal_oz smallint,

    created_at timestamptz not null
        default now(),

    constraint
        weekly_plan_prescriptions_week_valid
        check (week_number >= 1),

    constraint
        weekly_plan_prescriptions_dates_valid
        check (
            effective_to >= effective_from
        ),

    constraint
        weekly_plan_prescriptions_days_valid
        check (
            days_in_effect between 1 and 7
        ),

    constraint
        weekly_plan_prescriptions_targets_valid
        check (
            (
                calorie_target is null
                or calorie_target > 0
            )
            and (
                protein_grams is null
                or protein_grams >= 0
            )
            and (
                carb_grams is null
                or carb_grams >= 0
            )
            and (
                fat_grams is null
                or fat_grams >= 0
            )
            and weekly_cardio_target_minutes >= 0
            and (
                weekly_workout_target is null
                or weekly_workout_target >= 0
            )
            and (
                daily_water_goal_oz is null
                or daily_water_goal_oz >= 0
            )
        ),

    constraint
        weekly_plan_prescriptions_snapshot_unique
        unique (
            weekly_checkin_id,
            effective_from
        )
);

/******************************************************************************
    Indexes
******************************************************************************/

create index if not exists
    weekly_plan_prescriptions_plan_week_idx
on public.weekly_plan_prescriptions (
    coaching_plan_id,
    week_number,
    effective_from
);

create index if not exists
    weekly_plan_prescriptions_checkin_idx
on public.weekly_plan_prescriptions (
    weekly_checkin_id
);

/******************************************************************************
    Row Level Security
******************************************************************************/

alter table public.weekly_plan_prescriptions
    enable row level security;

drop policy if exists
    "Users can view their own weekly prescriptions"
on public.weekly_plan_prescriptions;

create policy
    "Users can view their own weekly prescriptions"
on public.weekly_plan_prescriptions
for select
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            weekly_plan_prescriptions.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

grant select
on table public.weekly_plan_prescriptions
to authenticated;

/******************************************************************************
    Snapshot function

    The program week represented by Weekly #N is:
        start_date + ((N - 1) * 7)
    through:
        week_start + 6

    Daily Check-Ins are submitted the following morning,
    but prescriptions are attached to the program dates
    they governed.
******************************************************************************/

create or replace function
public.capture_weekly_plan_prescriptions(
    p_weekly_checkin_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_plan_id uuid;
    v_week_number integer;
    v_plan_start date;
    v_week_start date;
    v_week_end date;
begin
    select
        weekly.coaching_plan_id,
        weekly.week_number,
        plan.start_date
    into
        v_plan_id,
        v_week_number,
        v_plan_start
    from public.weekly_checkins as weekly
    join public.coaching_plans as plan
      on plan.id = weekly.coaching_plan_id
    where weekly.id = p_weekly_checkin_id;

    if v_plan_id is null
       or v_week_number is null
       or v_plan_start is null then
        return;
    end if;

    v_week_start :=
        v_plan_start +
        ((v_week_number - 1) * 7);

    v_week_end :=
        v_week_start + 6;

    /*
        Include:
        1) the target already active when the week began
        2) every new target that became effective during
           that same week
    */
    with target_candidates as (
        select
            target.*,
            v_week_start as week_start,
            v_week_end as week_end
        from public.coaching_plan_targets
            as target
        where target.coaching_plan_id =
                v_plan_id
          and target.effective_date <=
                v_week_end
          and (
              target.effective_date >=
                  v_week_start
              or target.id = (
                  select prior.id
                  from public.coaching_plan_targets
                      as prior
                  where prior.coaching_plan_id =
                          v_plan_id
                    and prior.effective_date <=
                          v_week_start
                  order by
                      prior.effective_date desc,
                      prior.created_at desc
                  limit 1
              )
          )
    ),
    sequenced as (
        select
            candidate.*,
            lead(
                candidate.effective_date
            ) over (
                order by
                    candidate.effective_date,
                    candidate.created_at
            ) as next_effective_date
        from target_candidates as candidate
    ),
    segments as (
        select
            sequenced.*,
            greatest(
                sequenced.effective_date,
                sequenced.week_start
            ) as segment_start,
            least(
                coalesce(
                    sequenced.next_effective_date - 1,
                    sequenced.week_end
                ),
                sequenced.week_end
            ) as segment_end
        from sequenced
    )
    insert into
        public.weekly_plan_prescriptions (
            weekly_checkin_id,
            coaching_plan_id,
            source_target_id,
            week_number,
            effective_from,
            effective_to,
            days_in_effect,
            calorie_target,
            protein_grams,
            carb_grams,
            fat_grams,
            weekly_cardio_target_minutes,
            weekly_workout_target,
            daily_water_goal_oz
        )
    select
        p_weekly_checkin_id,
        v_plan_id,
        segments.id,
        v_week_number,
        segments.segment_start,
        segments.segment_end,
        (
            segments.segment_end -
            segments.segment_start +
            1
        )::smallint,
        segments.calorie_target,
        segments.protein_grams,
        segments.carb_grams,
        segments.fat_grams,
        segments.weekly_cardio_target_minutes,
        segments.weekly_workout_target,
        segments.daily_water_goal_oz
    from segments
    where segments.segment_start <=
          segments.segment_end
    on conflict (
        weekly_checkin_id,
        effective_from
    )
    do nothing;
end;
$$;

/******************************************************************************
    Capture automatically when Weekly closes
******************************************************************************/

create or replace function
public.capture_weekly_prescriptions_on_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.status = 'completed'
       and old.status is distinct from 'completed' then
        perform
            public.capture_weekly_plan_prescriptions(
                new.id
            );
    end if;

    return new;
end;
$$;

drop trigger if exists
    weekly_checkins_capture_prescriptions
on public.weekly_checkins;

create trigger
    weekly_checkins_capture_prescriptions
after update of status
on public.weekly_checkins
for each row
execute function
    public.capture_weekly_prescriptions_on_complete();

/******************************************************************************
    Backfill Weekly Check-Ins already completed before
    this migration.
******************************************************************************/

do $$
declare
    weekly_record record;
begin
    for weekly_record in
        select id
        from public.weekly_checkins
        where status = 'completed'
    loop
        perform
            public.capture_weekly_plan_prescriptions(
                weekly_record.id
            );
    end loop;
end;
$$;

/******************************************************************************
    Documentation
******************************************************************************/

comment on table
    public.weekly_plan_prescriptions
is 'Immutable per-week snapshots of the plan targets that were actually in effect during a completed Weekly Check-In week. Multiple rows mean the prescription changed during that week.';

comment on column
    public.weekly_plan_prescriptions.days_in_effect
is 'Number of program days in this Weekly period for which this prescription applied.';
