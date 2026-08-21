/*
======================================================
20260821123000_bb_prescription_foundation.sql

Purpose:
    Extends the existing effective-dated prescription
    model with the minimum Big Brain metadata/inputs:
    nutrition ownership, prescription provenance,
    cardio intensity targets, macro distribution
    preference, and pre-plan deficit context.

    Also carries the new prescription metadata into
    immutable Weekly prescription snapshots and adds
    an API-level immutability guard to canonical
    coaching_plan_targets rows.
======================================================
*/

begin;
/******************************************************************************
    1. BB-required user / intake inputs
******************************************************************************/

-- Current user preference used by the macro policy engine.
-- Nullable means the user has not explicitly chosen yet;
-- policy/UI may use Balanced as a fallback until answered.
alter table public.user_settings
    add column if not exists
        macro_distribution_preference text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname =
            'user_settings_macro_distribution_preference_valid'
          and conrelid =
            'public.user_settings'::regclass
    ) then
        alter table public.user_settings
            add constraint
                user_settings_macro_distribution_preference_valid
            check (
                macro_distribution_preference is null
                or macro_distribution_preference in (
                    'balanced',
                    'higher_carb',
                    'lower_carb'
                )
            );
    end if;
end
$$;

comment on column
    public.user_settings.macro_distribution_preference
is 'Current macro-distribution preference used by deterministic nutrition policy: balanced, higher_carb, or lower_carb. This is not a meal-planning preference.';

-- Captures meaningful deficit time immediately preceding a plan.
-- NULL = not answered / unknown; 0 = explicitly no prior deficit.
alter table public.start_checkins
    add column if not exists
        pre_plan_deficit_weeks smallint;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname =
            'start_checkins_pre_plan_deficit_weeks_valid'
          and conrelid =
            'public.start_checkins'::regclass
    ) then
        alter table public.start_checkins
            add constraint
                start_checkins_pre_plan_deficit_weeks_valid
            check (
                pre_plan_deficit_weeks is null
                or pre_plan_deficit_weeks >= 0
            );
    end if;
end
$$;

comment on column
    public.start_checkins.pre_plan_deficit_weeks
is 'Approximate continuous weeks in a meaningful calorie deficit immediately before this plan began. NULL means unknown/not answered.';

/******************************************************************************
    2. Canonical prescription provenance / ownership
******************************************************************************/

alter table public.coaching_plan_targets
    add column if not exists
        nutrition_ownership text
        not null
        default 'juntos_managed',
    add column if not exists
        prescription_source text,
    add column if not exists
        cardio_intensity_target text;

-- Existing target rows predate provenance tracking. Do not invent a
-- more specific source than we actually know.
update public.coaching_plan_targets
set prescription_source = 'legacy'
where prescription_source is null;

alter table public.coaching_plan_targets
    alter column prescription_source
        set default 'initial_plan',
    alter column prescription_source
        set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname =
            'coaching_plan_targets_nutrition_ownership_valid'
          and conrelid =
            'public.coaching_plan_targets'::regclass
    ) then
        alter table public.coaching_plan_targets
            add constraint
                coaching_plan_targets_nutrition_ownership_valid
            check (
                nutrition_ownership in (
                    'juntos_managed',
                    'self_managed'
                )
            );
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname =
            'coaching_plan_targets_prescription_source_valid'
          and conrelid =
            'public.coaching_plan_targets'::regclass
    ) then
        alter table public.coaching_plan_targets
            add constraint
                coaching_plan_targets_prescription_source_valid
            check (
                prescription_source in (
                    'legacy',
                    'initial_plan',
                    'bb_adjustment',
                    'user_override',
                    'admin_override',
                    'system_correction'
                )
            );
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname =
            'coaching_plan_targets_cardio_intensity_valid'
          and conrelid =
            'public.coaching_plan_targets'::regclass
    ) then
        alter table public.coaching_plan_targets
            add constraint
                coaching_plan_targets_cardio_intensity_valid
            check (
                cardio_intensity_target is null
                or cardio_intensity_target in (
                    'easy',
                    'moderate',
                    'hard'
                )
            );
    end if;
end
$$;

comment on column
    public.coaching_plan_targets.nutrition_ownership
is 'Who currently owns proactive nutrition prescription changes for this effective-dated target: juntos_managed or self_managed.';

comment on column
    public.coaching_plan_targets.prescription_source
is 'Provenance for this immutable prescription row: legacy, initial_plan, bb_adjustment, user_override, admin_override, or system_correction.';

comment on column
    public.coaching_plan_targets.cardio_intensity_target
is 'Optional prescribed cardio effort level. Kept separate from user-reported Daily cardio intensity.';

/******************************************************************************
    3. Preserve new prescription metadata in Weekly snapshots
******************************************************************************/

alter table public.weekly_plan_prescriptions
    add column if not exists
        nutrition_ownership text
        not null
        default 'juntos_managed',
    add column if not exists
        prescription_source text
        not null
        default 'legacy',
    add column if not exists
        cardio_intensity_target text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname =
            'weekly_plan_prescriptions_nutrition_ownership_valid'
          and conrelid =
            'public.weekly_plan_prescriptions'::regclass
    ) then
        alter table public.weekly_plan_prescriptions
            add constraint
                weekly_plan_prescriptions_nutrition_ownership_valid
            check (
                nutrition_ownership in (
                    'juntos_managed',
                    'self_managed'
                )
            );
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname =
            'weekly_plan_prescriptions_prescription_source_valid'
          and conrelid =
            'public.weekly_plan_prescriptions'::regclass
    ) then
        alter table public.weekly_plan_prescriptions
            add constraint
                weekly_plan_prescriptions_prescription_source_valid
            check (
                prescription_source in (
                    'legacy',
                    'initial_plan',
                    'bb_adjustment',
                    'user_override',
                    'admin_override',
                    'system_correction'
                )
            );
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname =
            'weekly_plan_prescriptions_cardio_intensity_valid'
          and conrelid =
            'public.weekly_plan_prescriptions'::regclass
    ) then
        alter table public.weekly_plan_prescriptions
            add constraint
                weekly_plan_prescriptions_cardio_intensity_valid
            check (
                cardio_intensity_target is null
                or cardio_intensity_target in (
                    'easy',
                    'moderate',
                    'hard'
                )
            );
    end if;
end
$$;

-- Future Weekly snapshots copy all prescription metadata from the
-- canonical coaching_plan_targets row. Existing snapshots stay truthful:
-- unknown historical provenance remains 'legacy'.
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
            daily_water_goal_oz,
            nutrition_ownership,
            prescription_source,
            cardio_intensity_target
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
        segments.daily_water_goal_oz,
        segments.nutrition_ownership,
        segments.prescription_source,
        segments.cardio_intensity_target
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
    9. Canonical target immutability guard

    API roles may INSERT new prescription rows but may not rewrite or
    directly delete an existing target. Direct database migrations/admin
    SQL (no request JWT role) can still perform emergency repair.

    Child deletes caused by deleting the parent plan remain possible.
******************************************************************************/

create or replace function
public.enforce_coaching_plan_target_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_request_role text;
begin
    v_request_role := coalesce(
        current_setting(
            'request.jwt.claim.role',
            true
        ),
        ''
    );

    if v_request_role in (
        'anon',
        'authenticated',
        'service_role'
    ) then
        if tg_op = 'UPDATE' then
            raise exception
                'Coaching plan targets are immutable. Insert a new effective-dated prescription instead.';
        end if;

        if tg_op = 'DELETE'
           and exists (
               select 1
               from public.coaching_plans
               where id = old.coaching_plan_id
           ) then
            raise exception
                'Coaching plan targets are immutable. Delete the parent plan only when intentionally removing the full plan.';
        end if;
    end if;

    if tg_op = 'DELETE' then
        return old;
    end if;

    return new;
end;
$$;

drop trigger if exists
    coaching_plan_targets_enforce_immutability
on public.coaching_plan_targets;

create trigger
    coaching_plan_targets_enforce_immutability
before update or delete
on public.coaching_plan_targets
for each row
execute function
    public.enforce_coaching_plan_target_immutability();

-- Big Brain reads these inputs and INSERTS new effective-dated
-- prescriptions. Existing target rows are never rewritten.
grant select on table
    public.user_settings,
    public.start_checkins,
    public.weekly_coach_reviews
to service_role;

grant select, insert on table
    public.coaching_plan_targets
to service_role;

commit;
