/*
======================================================
20260720000400_start_checkin_protocol_v1.sql

Purpose:
    Finalizes the Start Check-In measurement protocol,
    stores one plan-level measurement side, and adds a
    plan-level body-fat tracking source.

Notes:
    Existing drafts, saved weight, and uploaded photos
    are preserved.

Created:
    2026-07-20
======================================================
*/

/******************************************************************************
    Coaching Plan Settings
******************************************************************************/

alter table public.coaching_plans
    add column if not exists measurement_side text,
    add column if not exists body_fat_source text
        not null default 'scale';

alter table public.coaching_plans
    drop constraint if exists
        coaching_plans_measurement_side_valid,
    drop constraint if exists
        coaching_plans_body_fat_source_valid;

alter table public.coaching_plans
    add constraint
        coaching_plans_measurement_side_valid
        check (
            measurement_side is null
            or measurement_side in ('left', 'right')
        ),
    add constraint
        coaching_plans_body_fat_source_valid
        check (
            body_fat_source in (
                'scale',
                'juntos_estimate',
                'none'
            )
        );

/******************************************************************************
    Start Check-In Protocol Columns
******************************************************************************/

alter table public.start_checkins
    add column if not exists body_fat_percent
        numeric(4,1),
    add column if not exists body_fat_status text,
    add column if not exists body_fat_method text,
    add column if not exists
        body_fat_formula_version text,
    add column if not exists upper_arm_inches
        numeric(5,2),
    add column if not exists thigh_inches
        numeric(5,2),
    add column if not exists calf_inches
        numeric(5,2),
    add column if not exists
        measurement_protocol_version text
        not null default 'v1';

/******************************************************************************
    Preserve Existing Draft Data
******************************************************************************/

update public.coaching_plans as plan
set measurement_side =
    start_checkins.side_photo_view
from public.start_checkins
where start_checkins.coaching_plan_id = plan.id
  and plan.measurement_side is null
  and start_checkins.side_photo_view is not null;

update public.start_checkins
set
    body_fat_percent =
        scale_body_fat_percent,
    body_fat_status =
        case
            when scale_body_fat_percent is not null
                then 'recorded'
            when status = 'completed'
                then 'unavailable'
            else null
        end,
    body_fat_method =
        case
            when scale_body_fat_percent is not null
                then 'scale'
            else null
        end,
    upper_arm_inches =
        case
            when side_photo_view = 'left'
                then left_upper_arm_inches
            when side_photo_view = 'right'
                then right_upper_arm_inches
            else coalesce(
                right_upper_arm_inches,
                left_upper_arm_inches
            )
        end,
    thigh_inches =
        case
            when side_photo_view = 'left'
                then left_thigh_inches
            when side_photo_view = 'right'
                then right_thigh_inches
            else coalesce(
                right_thigh_inches,
                left_thigh_inches
            )
        end,
    calf_inches =
        case
            when side_photo_view = 'left'
                then left_calf_inches
            when side_photo_view = 'right'
                then right_calf_inches
            else coalesce(
                right_calf_inches,
                left_calf_inches
            )
        end;

/******************************************************************************
    Remove Superseded Fields and Constraints
******************************************************************************/

alter table public.start_checkins
    drop constraint if exists
        start_checkins_completed_fields_present,
    drop constraint if exists
        start_checkins_measurements_positive,
    drop constraint if exists
        start_checkins_body_fat_valid,
    drop constraint if exists
        start_checkins_side_photo_view_valid;

alter table public.start_checkins
    drop column if exists scale_body_fat_percent,
    drop column if exists right_upper_arm_inches,
    drop column if exists left_upper_arm_inches,
    drop column if exists right_thigh_inches,
    drop column if exists left_thigh_inches,
    drop column if exists right_calf_inches,
    drop column if exists left_calf_inches,
    drop column if exists side_photo_view;

/******************************************************************************
    New Start Check-In Constraints
******************************************************************************/

alter table public.start_checkins
    drop constraint if exists
        start_checkins_measurements_positive_v1,
    drop constraint if exists
        start_checkins_body_fat_consistency;

alter table public.start_checkins
    add constraint
        start_checkins_measurements_positive_v1
        check (
            coalesce(starting_weight_lbs, 1) > 0
            and coalesce(neck_inches, 1) > 0
            and coalesce(chest_inches, 1) > 0
            and coalesce(waist_inches, 1) > 0
            and coalesce(hips_inches, 1) > 0
            and coalesce(upper_arm_inches, 1) > 0
            and coalesce(thigh_inches, 1) > 0
            and coalesce(calf_inches, 1) > 0
            and (
                body_fat_percent is null
                or body_fat_percent
                    between 0.1 and 100
            )
        ),
    add constraint
        start_checkins_body_fat_consistency
        check (
            (
                body_fat_status is null
                and body_fat_percent is null
                and body_fat_method is null
                and body_fat_formula_version is null
            )
            or
            (
                body_fat_status = 'recorded'
                and body_fat_percent is not null
                and body_fat_method = 'scale'
                and body_fat_formula_version is null
            )
            or
            (
                body_fat_status = 'unavailable'
                and body_fat_percent is null
                and body_fat_method is null
                and body_fat_formula_version is null
            )
            or
            (
                body_fat_status = 'estimated'
                and body_fat_percent is not null
                and body_fat_method =
                    'juntos_estimate'
                and body_fat_formula_version
                    is not null
            )
            or
            (
                body_fat_status = 'not_tracked'
                and body_fat_percent is null
                and body_fat_method is null
                and body_fat_formula_version is null
            )
        );

/******************************************************************************
    Progress Photo Side Validation
******************************************************************************/

create or replace function
public.validate_progress_photo_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    parent_user_id uuid;
    parent_plan_id uuid;
    required_side_view text;
begin
    if new.photo_context = 'start' then
        select
            coaching_plans.user_id,
            coaching_plans.id,
            coaching_plans.measurement_side
        into
            parent_user_id,
            parent_plan_id,
            required_side_view
        from public.start_checkins
        join public.coaching_plans
          on coaching_plans.id =
             start_checkins.coaching_plan_id
        where start_checkins.id =
            new.start_checkin_id;
    else
        select
            weekly_checkins.user_id,
            weekly_checkins.coaching_plan_id,
            coaching_plans.measurement_side
        into
            parent_user_id,
            parent_plan_id,
            required_side_view
        from public.weekly_checkins
        join public.coaching_plans
          on coaching_plans.id =
             weekly_checkins.coaching_plan_id
        where weekly_checkins.id =
            new.weekly_checkin_id;
    end if;

    if parent_user_id is null
       or parent_plan_id is null then
        raise exception
            'The photo parent check-in does not exist.';
    end if;

    if new.user_id <> parent_user_id
       or new.coaching_plan_id <>
          parent_plan_id then
        raise exception
            'Photo ownership does not match its check-in.';
    end if;

    if new.pose = 'side'
       and (
           required_side_view is null
           or required_side_view is distinct from
              new.side_view
       ) then
        raise exception
            'The side photo must use the plan measurement side.';
    end if;

    return new;
end;
$$;

/******************************************************************************
    Completed Start Check-In Validation
******************************************************************************/

create or replace function
public.enforce_start_checkin_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    plan_side text;
    plan_body_fat_source text;
    front_count integer;
    side_count integer;
    back_count integer;
begin
    if new.status <> 'completed' then
        return new;
    end if;

    select
        measurement_side,
        body_fat_source
    into
        plan_side,
        plan_body_fat_source
    from public.coaching_plans
    where id = new.coaching_plan_id;

    if plan_side is null then
        raise exception
            'Choose a measurement side before completing the Start Check-In.';
    end if;

    if new.starting_weight_lbs is null
       or new.neck_inches is null
       or new.chest_inches is null
       or new.waist_inches is null
       or new.hips_inches is null
       or new.upper_arm_inches is null
       or new.thigh_inches is null
       or new.calf_inches is null then
        raise exception
            'All required Start Check-In measurements must be entered.';
    end if;

    if plan_body_fat_source = 'scale'
       and new.body_fat_status not in (
           'recorded',
           'unavailable'
       ) then
        raise exception
            'Enter the scale body-fat reading or mark it unavailable.';
    end if;

    if plan_body_fat_source = 'juntos_estimate'
       and new.body_fat_status <> 'estimated' then
        raise exception
            'The Juntos Fit body-fat estimate is required.';
    end if;

    if plan_body_fat_source = 'none'
       and new.body_fat_status <> 'not_tracked' then
        raise exception
            'Body fat must be marked as not tracked.';
    end if;

    select
        count(*) filter (
            where pose = 'front'
        ),
        count(*) filter (
            where pose = 'side'
              and side_view = plan_side
        ),
        count(*) filter (
            where pose = 'back'
        )
    into
        front_count,
        side_count,
        back_count
    from public.progress_photos
    where start_checkin_id = new.id;

    if front_count <> 1
       or side_count <> 1
       or back_count <> 1 then
        raise exception
            'Front, matching side, and back photos are required.';
    end if;

    return new;
end;
$$;

drop trigger if exists
    start_checkins_require_photos
on public.start_checkins;

drop trigger if exists
    start_checkins_validate_completion
on public.start_checkins;

create trigger start_checkins_validate_completion
before insert or update
on public.start_checkins
for each row
execute function
    public.enforce_start_checkin_completion();

/******************************************************************************
    Create Plan RPC With Body-Fat Source
******************************************************************************/

drop function if exists
public.create_coaching_plan_with_targets(
    date,
    integer,
    integer,
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

    insert into public.coaching_plans (
        user_id,
        start_date,
        checkin_day,
        program_length_weeks,
        goal,
        body_fat_source,
        status
    )
    values (
        v_user_id,
        p_start_date,
        p_checkin_day::smallint,
        p_program_length_weeks::smallint,
        p_goal,
        p_body_fat_source,
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

comment on column
public.coaching_plans.measurement_side
is 'The single side used for unilateral measurements and side progress photos.';

comment on column
public.coaching_plans.body_fat_source
is 'The body-fat method used consistently for the plan: scale, Juntos Fit estimate, or none.';

comment on column
public.start_checkins.measurement_protocol_version
is 'The measurement instruction version used for this baseline.';
