/*
======================================================
20260816072000_weekly_checkin_draft_schedule_validation.sql

Purpose:
    Updates Weekly Check-In schedule validation so a
    real Weekly draft may exist before its linked
    Daily Check-In is created.

Why:
    Weekly draft/autosave intentionally allows
    daily_checkin_id = null until final submission.
    The older validation trigger still required the
    Daily row during INSERT, which blocked creation of
    the draft.

Rules preserved/enforced:
    - The coaching plan must exist.
    - week_number must fit inside the plan.
    - The Weekly check-in date cannot be before that
      numbered week's scheduled Weekly date.
    - The scheduled Weekly date honors checkin_day.
    - A linked Daily Check-In, when present, must
      belong to the same coaching plan and calendar
      date.
    - Completion consistency remains enforced by the
      existing weekly_checkins_completion_consistency
      constraint, which requires daily_checkin_id for
      completed rows.
======================================================
*/

create or replace function
public.validate_weekly_checkin_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    plan_start_date date;
    plan_checkin_day integer;
    plan_length_weeks integer;

    first_eligible_date date;
    first_eligible_weekday integer;
    days_until_checkin integer;
    first_weekly_date date;
    scheduled_checkin_date date;

    linked_daily_plan_id uuid;
    linked_daily_checkin_date date;
begin
    /*
     * Load the coaching plan independently.
     *
     * A Weekly draft is allowed to have no linked
     * Daily Check-In yet, so plan lookup must not
     * depend on daily_checkin_id.
     */
    select
        cp.start_date,
        cp.checkin_day,
        cp.program_length_weeks
    into
        plan_start_date,
        plan_checkin_day,
        plan_length_weeks
    from public.coaching_plans as cp
    where cp.id = new.coaching_plan_id;

    if not found then
        raise exception
            'The coaching plan does not exist.';
    end if;

    if new.week_number < 1
       or new.week_number > plan_length_weeks then
        raise exception
            'Week % is outside the coaching plan length of % weeks.',
            new.week_number,
            plan_length_weeks;
    end if;

    if plan_checkin_day is null
       or plan_checkin_day < 0
       or plan_checkin_day > 6 then
        raise exception
            'The coaching plan does not have a valid weekly check-in day.';
    end if;

    /*
     * Match the app rule:
     *   1. No Weekly is due until at least seven full
     *      days after Start Day.
     *   2. From that date, use the first occurrence of
     *      the plan's selected checkin_day.
     *   3. Later Weeklies recur every seven days.
     *
     * PostgreSQL EXTRACT(DOW) uses Sunday=0 through
     * Saturday=6, matching the app's persisted value.
     */
    first_eligible_date :=
        plan_start_date + 7;

    first_eligible_weekday :=
        extract(
            dow from first_eligible_date
        )::integer;

    days_until_checkin :=
        (
            plan_checkin_day
            - first_eligible_weekday
            + 7
        ) % 7;

    first_weekly_date :=
        first_eligible_date
        + days_until_checkin;

    scheduled_checkin_date :=
        first_weekly_date
        + ((new.week_number - 1) * 7);

    if new.checkin_date < scheduled_checkin_date then
        raise exception
            'Week % cannot be started before its scheduled date of %.',
            new.week_number,
            scheduled_checkin_date;
    end if;

    /*
     * Draft rows may legitimately have no Daily link.
     * Once a Daily is linked, validate ownership and
     * make sure both rows represent the same morning.
     */
    if new.daily_checkin_id is not null then
        select
            dc.coaching_plan_id,
            dc.checkin_date
        into
            linked_daily_plan_id,
            linked_daily_checkin_date
        from public.daily_checkins as dc
        where dc.id = new.daily_checkin_id;

        if not found then
            raise exception
                'The linked daily check-in does not exist.';
        end if;

        if linked_daily_plan_id <> new.coaching_plan_id then
            raise exception
                'The daily check-in must belong to the same coaching plan as the weekly check-in.';
        end if;

        if linked_daily_checkin_date <> new.checkin_date then
            raise exception
                'The linked daily check-in date must match the weekly check-in date.';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists
    weekly_checkins_validate_schedule
on public.weekly_checkins;

create trigger
    weekly_checkins_validate_schedule
before insert or update of
    coaching_plan_id,
    daily_checkin_id,
    checkin_date,
    week_number,
    status
on public.weekly_checkins
for each row
execute function
    public.validate_weekly_checkin_schedule();
