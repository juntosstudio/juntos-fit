/*
======================================================
20260720000500_plan_preferences_and_measurement_validation.sql

Purpose:
    Adds unit and time-zone preferences, plan tracking
    cadence, Start Check-In edit locking, and generous
    field-specific hard validation.

Created:
    2026-07-20
======================================================
*/

/******************************************************************************
    Profile Preferences
******************************************************************************/

alter table public.profiles
    add column if not exists unit_system text
        not null default 'imperial',
    add column if not exists time_zone text;

alter table public.profiles
    drop constraint if exists
        profiles_unit_system_valid;

alter table public.profiles
    add constraint profiles_unit_system_valid
        check (
            unit_system in (
                'imperial',
                'metric'
            )
        );

/******************************************************************************
    Coaching Plan Preferences
******************************************************************************/

alter table public.coaching_plans
    add column if not exists time_zone text,
    add column if not exists
        measurement_frequency_weeks integer
        not null default 1,
    add column if not exists
        photo_frequency_weeks integer
        not null default 4;

alter table public.coaching_plans
    drop constraint if exists
        coaching_plans_tracking_cadence_valid;

alter table public.coaching_plans
    add constraint
        coaching_plans_tracking_cadence_valid
        check (
            measurement_frequency_weeks
                between 1 and 12
            and photo_frequency_weeks
                between 1 and 52
        );

/******************************************************************************
    Field-Specific Hard Limits

    These are intentionally broad. The app gives a
    neutral confirmation warning well before these
    absolute database limits.
******************************************************************************/

alter table public.start_checkins
    drop constraint if exists
        start_checkins_measurements_positive_v1,
    drop constraint if exists
        start_checkins_hard_measurement_ranges;

alter table public.start_checkins
    add constraint
        start_checkins_hard_measurement_ranges
        check (
            (
                starting_weight_lbs is null
                or starting_weight_lbs
                    between 40 and 1000
            )
            and (
                body_fat_percent is null
                or body_fat_percent
                    between 1 and 85
            )
            and (
                neck_inches is null
                or neck_inches
                    between 6 and 35
            )
            and (
                chest_inches is null
                or chest_inches
                    between 15 and 100
            )
            and (
                waist_inches is null
                or waist_inches
                    between 12 and 120
            )
            and (
                hips_inches is null
                or hips_inches
                    between 15 and 120
            )
            and (
                upper_arm_inches is null
                or upper_arm_inches
                    between 3 and 45
            )
            and (
                thigh_inches is null
                or thigh_inches
                    between 6 and 60
            )
            and (
                calf_inches is null
                or calf_inches
                    between 4 and 40
            )
        );

/******************************************************************************
    Lock Measurement Side After Completion
******************************************************************************/

create or replace function
public.enforce_plan_measurement_side_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if old.measurement_side
       is distinct from new.measurement_side
       and exists (
           select 1
           from public.start_checkins
           where coaching_plan_id = old.id
             and status = 'completed'
       ) then
        raise exception
            'The measurement side is locked after the Start Check-In is completed.';
    end if;

    return new;
end;
$$;

drop trigger if exists
    coaching_plans_lock_measurement_side
on public.coaching_plans;

create trigger
    coaching_plans_lock_measurement_side
before update of measurement_side
on public.coaching_plans
for each row
execute function
    public.enforce_plan_measurement_side_lock();

/******************************************************************************
    Lock Completed Baseline After Start Date
******************************************************************************/

create or replace function
public.enforce_start_checkin_edit_window()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    plan_start_date date;
    plan_time_zone text;
    plan_local_date date;
    request_role text;
begin
    request_role := coalesce(
        current_setting(
            'request.jwt.claim.role',
            true
        ),
        ''
    );

    if request_role = 'service_role' then
        if tg_op = 'DELETE' then
            return old;
        end if;

        return new;
    end if;

    if old.status <> 'completed' then
        if tg_op = 'DELETE' then
            return old;
        end if;

        return new;
    end if;

    select
        start_date,
        coalesce(time_zone, 'UTC')
    into
        plan_start_date,
        plan_time_zone
    from public.coaching_plans
    where id = old.coaching_plan_id;

    plan_local_date :=
        timezone(
            plan_time_zone,
            now()
        )::date;

    if plan_local_date > plan_start_date then
        raise exception
            'The completed Start Check-In is locked after the plan start date.';
    end if;

    if tg_op = 'DELETE' then
        return old;
    end if;

    return new;
end;
$$;

drop trigger if exists
    start_checkins_lock_after_start_date
on public.start_checkins;

create trigger
    start_checkins_lock_after_start_date
before update or delete
on public.start_checkins
for each row
execute function
    public.enforce_start_checkin_edit_window();

/******************************************************************************
    Create Plan RPC With Preferences
******************************************************************************/

drop function if exists
public.create_coaching_plan_with_targets(
    date,
    integer,
    integer,
    text,
    text,
    integer,
    integer,
    integer,
    integer,
    integer,
    integer,
    integer
);

create function
public.create_coaching_plan_with_targets(
    p_start_date date,
    p_checkin_day integer,
    p_program_length_weeks integer,
    p_goal text,
    p_body_fat_source text,
    p_unit_system text,
    p_time_zone text,
    p_measurement_frequency_weeks integer,
    p_photo_frequency_weeks integer,
    p_calorie_target integer,
    p_protein_grams integer,
    p_carb_grams integer,
    p_fat_grams integer,
    p_weekly_cardio_target_minutes integer,
    p_weekly_workout_target integer,
    p_daily_water_goal_oz integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_plan_id uuid;
begin
    if v_user_id is null then
        raise exception
            'Authentication is required.';
    end if;

    if exists (
        select 1
        from public.coaching_plans
        where user_id = v_user_id
          and status = 'active'
    ) then
        raise exception
            'You already have an active coaching plan.';
    end if;

    if p_checkin_day not between 0 and 6 then
        raise exception
            'Weekly check-in day must be between 0 and 6.';
    end if;

    if p_program_length_weeks
       not between 1 and 52 then
        raise exception
            'Program length must be between 1 and 52 weeks.';
    end if;

    if p_goal not in (
        'fat_loss',
        'maintenance',
        'muscle_gain'
    ) then
        raise exception
            'The coaching goal is invalid.';
    end if;

    if p_body_fat_source not in (
        'scale',
        'juntos_estimate',
        'none'
    ) then
        raise exception
            'The body-fat source is invalid.';
    end if;

    if p_unit_system not in (
        'imperial',
        'metric'
    ) then
        raise exception
            'The unit system is invalid.';
    end if;

    if p_time_zone is null
       or btrim(p_time_zone) = '' then
        raise exception
            'A time zone is required.';
    end if;

    begin
        perform timezone(p_time_zone, now());
    exception
        when invalid_parameter_value then
            raise exception
                'The time zone is invalid.';
    end;

    if p_measurement_frequency_weeks
       not between 1 and 12
       or p_photo_frequency_weeks
       not between 1 and 52 then
        raise exception
            'The progress tracking cadence is invalid.';
    end if;

    if p_calorie_target <= 0 then
        raise exception
            'Calories must be greater than zero.';
    end if;

    if least(
        p_protein_grams,
        p_carb_grams,
        p_fat_grams,
        p_weekly_cardio_target_minutes,
        p_weekly_workout_target,
        p_daily_water_goal_oz
    ) < 0 then
        raise exception
            'Plan targets cannot be negative.';
    end if;

    update public.profiles
    set
        unit_system = p_unit_system,
        time_zone = p_time_zone
    where id = v_user_id;

    insert into public.coaching_plans (
        user_id,
        start_date,
        checkin_day,
        program_length_weeks,
        goal,
        body_fat_source,
        time_zone,
        measurement_frequency_weeks,
        photo_frequency_weeks,
        status
    )
    values (
        v_user_id,
        p_start_date,
        p_checkin_day::smallint,
        p_program_length_weeks::smallint,
        p_goal,
        p_body_fat_source,
        p_time_zone,
        p_measurement_frequency_weeks,
        p_photo_frequency_weeks,
        'active'
    )
    returning id into v_plan_id;

    insert into public.coaching_plan_targets (
        coaching_plan_id,
        effective_date,
        calorie_target,
        protein_grams,
        carb_grams,
        fat_grams,
        weekly_cardio_target_minutes,
        weekly_workout_target,
        daily_water_goal_oz
    )
    values (
        v_plan_id,
        p_start_date,
        p_calorie_target::smallint,
        p_protein_grams::smallint,
        p_carb_grams::smallint,
        p_fat_grams::smallint,
        p_weekly_cardio_target_minutes::smallint,
        p_weekly_workout_target,
        p_daily_water_goal_oz::smallint
    );

    return v_plan_id;
end;
$$;

revoke all
on function
public.create_coaching_plan_with_targets(
    date,
    integer,
    integer,
    text,
    text,
    text,
    text,
    integer,
    integer,
    integer,
    integer,
    integer,
    integer,
    integer,
    integer,
    integer
)
from public;

grant execute
on function
public.create_coaching_plan_with_targets(
    date,
    integer,
    integer,
    text,
    text,
    text,
    text,
    integer,
    integer,
    integer,
    integer,
    integer,
    integer,
    integer,
    integer,
    integer
)
to authenticated;

/******************************************************************************
    Comments
******************************************************************************/

comment on column public.profiles.unit_system
is 'Preferred display units: imperial or metric.';

comment on column public.profiles.time_zone
is 'The user IANA time-zone preference.';

comment on column public.coaching_plans.time_zone
is 'The IANA time zone locked to the coaching plan schedule.';

comment on column
public.coaching_plans.measurement_frequency_weeks
is 'How often weekly check-ins request body measurements.';

comment on column
public.coaching_plans.photo_frequency_weeks
is 'How often weekly check-ins request progress photos.';
