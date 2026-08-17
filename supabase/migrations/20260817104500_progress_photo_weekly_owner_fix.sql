/*
======================================================
20260817104500_progress_photo_weekly_owner_fix.sql

Purpose:
    Repair progress-photo parent validation for the
    current Weekly Check-In ownership model.

Current ownership model:
    weekly_checkins.coaching_plan_id
        -> coaching_plans.id
        -> coaching_plans.user_id

Notes:
    - Replaces the existing validation function only.
    - Existing trigger continues to call this function.
    - progress_photos.user_id remains valid and is
      checked against the owning coaching plan.
======================================================
*/

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
            cp.user_id,
            cp.id,
            cp.measurement_side
        into
            parent_user_id,
            parent_plan_id,
            required_side_view
        from public.start_checkins as sc
        join public.coaching_plans as cp
          on cp.id = sc.coaching_plan_id
        where sc.id = new.start_checkin_id;
    else
        select
            cp.user_id,
            wc.coaching_plan_id,
            cp.measurement_side
        into
            parent_user_id,
            parent_plan_id,
            required_side_view
        from public.weekly_checkins as wc
        join public.coaching_plans as cp
          on cp.id = wc.coaching_plan_id
        where wc.id = new.weekly_checkin_id;
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
