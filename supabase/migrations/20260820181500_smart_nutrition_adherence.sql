-- Smart meal-plan adherence V1
--
-- Daily self-report scores remain the source data. This migration freezes
-- the derived Weekly adherence snapshot at completion so historical Weeks do
-- not change if the scoring policy is tuned later.

alter table public.weekly_checkins
    add column if not exists
        nutrition_adherence_percent smallint,
    add column if not exists
        nutrition_adherence_days_reported smallint,
    add column if not exists
        nutrition_adherence_expected_days smallint,
    add column if not exists
        nutrition_adherence_coverage_percent smallint,
    add column if not exists
        nutrition_adherence_policy_version text;

alter table public.weekly_checkins
    drop constraint if exists
        weekly_checkins_nutrition_adherence_percent_valid,
    drop constraint if exists
        weekly_checkins_nutrition_adherence_days_valid,
    drop constraint if exists
        weekly_checkins_nutrition_adherence_coverage_valid;

alter table public.weekly_checkins
    add constraint
        weekly_checkins_nutrition_adherence_percent_valid
    check (
        nutrition_adherence_percent is null
        or nutrition_adherence_percent between 0 and 100
    ),
    add constraint
        weekly_checkins_nutrition_adherence_days_valid
    check (
        (
            nutrition_adherence_days_reported is null
            and nutrition_adherence_expected_days is null
        )
        or (
            nutrition_adherence_days_reported between 0 and 7
            and nutrition_adherence_expected_days between 1 and 7
            and nutrition_adherence_days_reported <=
                nutrition_adherence_expected_days
        )
    ),
    add constraint
        weekly_checkins_nutrition_adherence_coverage_valid
    check (
        nutrition_adherence_coverage_percent is null
        or nutrition_adherence_coverage_percent between 0 and 100
    );

create or replace function public.calculate_weekly_nutrition_adherence(
    p_coaching_plan_id uuid,
    p_weekly_checkin_date date
)
returns table (
    adherence_percent smallint,
    days_reported smallint,
    expected_days smallint,
    coverage_percent smallint
)
language sql
stable
set search_path = public
as $$
    with scored_days as (
        select
            case
                -- A planned cheat meal that was the only deviation is part of
                -- the plan, so it remains fully adherent.
                when daily.planned_cheat_meal_status = 'eaten'
                 and nullif(trim(daily.meal_plan_deviation_details), '') is null
                 and daily.meal_plan_score between 1 and 4
                    then 100
                when daily.meal_plan_score = 5 then 100
                when daily.meal_plan_score = 4 then 95
                when daily.meal_plan_score = 3 then 80
                when daily.meal_plan_score = 2 then 60
                when daily.meal_plan_score = 1 then 30
                else null
            end::numeric as daily_adherence
        from public.daily_checkins as daily
        where daily.coaching_plan_id = p_coaching_plan_id
          and daily.checkin_date between
              (p_weekly_checkin_date - 6)
              and p_weekly_checkin_date
    ),
    summarized as (
        select
            round(avg(daily_adherence))::smallint as adherence_percent,
            count(daily_adherence)::smallint as days_reported
        from scored_days
        where daily_adherence is not null
    )
    select
        summarized.adherence_percent,
        summarized.days_reported,
        7::smallint as expected_days,
        round(
            summarized.days_reported::numeric /
            7::numeric * 100
        )::smallint as coverage_percent
    from summarized;
$$;

create or replace function public.weekly_checkins_freeze_nutrition_adherence()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    calculated record;
    should_freeze boolean := false;
begin
    -- Drafts intentionally remain unfrozen. Freeze once, at the transition to
    -- completed, and never rewrite a historical snapshot afterward.
    if tg_op = 'INSERT' then
        should_freeze := new.status = 'completed';
    elsif tg_op = 'UPDATE' then
        should_freeze :=
            new.status = 'completed'
            and old.status is distinct from 'completed';
    end if;

    if should_freeze then
        select *
        into calculated
        from public.calculate_weekly_nutrition_adherence(
            new.coaching_plan_id,
            new.checkin_date
        );

        new.nutrition_adherence_percent :=
            calculated.adherence_percent;
        new.nutrition_adherence_days_reported :=
            calculated.days_reported;
        new.nutrition_adherence_expected_days :=
            calculated.expected_days;
        new.nutrition_adherence_coverage_percent :=
            calculated.coverage_percent;
        new.nutrition_adherence_policy_version :=
            'meal_plan_self_report_v1';
    end if;

    return new;
end;
$$;

drop trigger if exists
    weekly_checkins_freeze_nutrition_adherence
on public.weekly_checkins;

create trigger
    weekly_checkins_freeze_nutrition_adherence
before insert or update of status
on public.weekly_checkins
for each row
execute function
    public.weekly_checkins_freeze_nutrition_adherence();

-- Freeze existing completed Weeks under V1 once so the UI and Big Brain have
-- stable historical adherence values from this point forward.
with adherence_backfill as (
    select
        weekly.id as weekly_checkin_id,
        calculated.adherence_percent,
        calculated.days_reported,
        calculated.expected_days,
        calculated.coverage_percent
    from public.weekly_checkins as weekly
    cross join lateral
        public.calculate_weekly_nutrition_adherence(
            weekly.coaching_plan_id,
            weekly.checkin_date
        ) as calculated
    where weekly.status = 'completed'
      and weekly.nutrition_adherence_policy_version is null
)
update public.weekly_checkins as weekly
set
    nutrition_adherence_percent = backfill.adherence_percent,
    nutrition_adherence_days_reported = backfill.days_reported,
    nutrition_adherence_expected_days = backfill.expected_days,
    nutrition_adherence_coverage_percent = backfill.coverage_percent,
    nutrition_adherence_policy_version = 'meal_plan_self_report_v1'
from adherence_backfill as backfill
where weekly.id = backfill.weekly_checkin_id;
