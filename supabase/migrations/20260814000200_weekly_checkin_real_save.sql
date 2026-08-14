/*
======================================================
20260814000200_weekly_checkin_real_save.sql

Purpose:
    Makes Weekly Check-Ins draftable, resumable,
    autosavable, and submit-ready without requiring
    a Daily Check-In row until final submission.

Notes:
    - Existing submitted rows are preserved.
    - The existing unique (coaching_plan_id,
      week_number) constraint remains the primary
      duplicate guard.
    - Existing weekly RLS ownership policies and the
      updated_at trigger remain in place.
======================================================
*/

/******************************************************************************
    Draft-compatible core columns
******************************************************************************/

alter table public.weekly_checkins
    alter column daily_checkin_id
    drop not null;

alter table public.weekly_checkins
    alter column submitted_at
    drop default;

alter table public.weekly_checkins
    alter column submitted_at
    drop not null;

alter table public.weekly_checkins
    add column if not exists
        checkin_date date;

-- Older Weekly rows got their calendar date from the
-- linked Daily row. Preserve that value before making
-- checkin_date required.
update public.weekly_checkins as weekly
set checkin_date = daily.checkin_date
from public.daily_checkins as daily
where weekly.daily_checkin_id = daily.id
  and weekly.checkin_date is null;

alter table public.weekly_checkins
    alter column checkin_date
    set not null;

alter table public.weekly_checkins
    add column if not exists
        status text not null
        default 'draft',
    add column if not exists
        draft_data jsonb not null
        default '{}'::jsonb,
    add column if not exists
        resume_step text,
    add column if not exists
        photos_required boolean not null
        default false,
    add column if not exists
        measurement_side text,
    add column if not exists
        body_fat_percent numeric(5,2),
    add column if not exists
        body_fat_source text,
    add column if not exists
        body_fat_method text,
    add column if not exists
        sleep_quality smallint,
    add column if not exists
        energy_level smallint,
    add column if not exists
        recovery_score smallint,
    add column if not exists
        stress_level smallint,
    add column if not exists
        menstrual_cycle_context text,
    add column if not exists
        weekly_reflection text;

-- Under the original schema, any existing row was a
-- completed submission because both submitted_at and
-- daily_checkin_id were required.
update public.weekly_checkins
set status = 'completed'
where submitted_at is not null;

/******************************************************************************
    Validation
******************************************************************************/

alter table public.weekly_checkins
    drop constraint if exists
        weekly_checkins_status_valid;

alter table public.weekly_checkins
    add constraint
        weekly_checkins_status_valid
    check (
        status in (
            'draft',
            'completed'
        )
    );

alter table public.weekly_checkins
    drop constraint if exists
        weekly_checkins_completion_consistency;

alter table public.weekly_checkins
    add constraint
        weekly_checkins_completion_consistency
    check (
        (
            status = 'draft'
            and submitted_at is null
        )
        or
        (
            status = 'completed'
            and submitted_at is not null
            and daily_checkin_id is not null
        )
    );

alter table public.weekly_checkins
    drop constraint if exists
        weekly_checkins_measurement_side_valid;

alter table public.weekly_checkins
    add constraint
        weekly_checkins_measurement_side_valid
    check (
        measurement_side is null
        or measurement_side in (
            'left',
            'right'
        )
    );

alter table public.weekly_checkins
    drop constraint if exists
        weekly_checkins_body_fat_source_valid;

alter table public.weekly_checkins
    add constraint
        weekly_checkins_body_fat_source_valid
    check (
        body_fat_source is null
        or body_fat_source in (
            'scale',
            'juntos_estimate',
            'none'
        )
    );

alter table public.weekly_checkins
    drop constraint if exists
        weekly_checkins_body_fat_percent_valid;

alter table public.weekly_checkins
    add constraint
        weekly_checkins_body_fat_percent_valid
    check (
        body_fat_percent is null
        or body_fat_percent between 0 and 100
    );

alter table public.weekly_checkins
    drop constraint if exists
        weekly_checkins_recovery_scores_valid;

alter table public.weekly_checkins
    add constraint
        weekly_checkins_recovery_scores_valid
    check (
        (
            sleep_quality is null
            or sleep_quality between 1 and 5
        )
        and (
            energy_level is null
            or energy_level between 1 and 5
        )
        and (
            recovery_score is null
            or recovery_score between 1 and 5
        )
        and (
            stress_level is null
            or stress_level between 1 and 5
        )
    );

/******************************************************************************
    Duplicate protection / lookup
******************************************************************************/

create unique index if not exists
    weekly_checkins_plan_date_unique
on public.weekly_checkins (
    coaching_plan_id,
    checkin_date
);

/******************************************************************************
    Photo-week completion guard
******************************************************************************/

create or replace function
public.enforce_weekly_checkin_photos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    photo_count integer;
begin
    if new.status = 'completed'
       and old.status is distinct from 'completed'
       and new.photos_required then

        select count(*)
        into photo_count
        from public.progress_photos
        where weekly_checkin_id = new.id;

        if photo_count <> 3 then
            raise exception
                'Front, side, and back photos are required.';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists
    weekly_checkins_require_photos
on public.weekly_checkins;

create trigger
    weekly_checkins_require_photos
before update of status
on public.weekly_checkins
for each row
execute function
    public.enforce_weekly_checkin_photos();

/******************************************************************************
    Data API grant
******************************************************************************/

-- Existing RLS policies continue to control which
-- plan-owned rows the authenticated user may access.
grant select, insert, update
on table public.weekly_checkins
to authenticated;

/******************************************************************************
    Documentation
******************************************************************************/

comment on column
    public.weekly_checkins.draft_data
is 'Complete in-progress Weekly form snapshot used for autosave/resume and forward-compatible question changes.';

comment on column
    public.weekly_checkins.resume_step
is 'Wizard step identifier used to resume a saved Weekly draft.';

comment on column
    public.weekly_checkins.body_fat_method
is 'Method/version used for the saved body-fat estimate, for example rfm_v1.';
