/*
======================================================
20260817153000_daily_cardio_context.sql

Adds cardio type + effort context to Daily Check-Ins.

Existing historical rows are intentionally NOT backfilled:
we do not invent cardio type or intensity that the user
never reported.
======================================================
*/

alter table public.daily_checkins
    add column if not exists cardio_type text;

alter table public.daily_checkins
    add column if not exists cardio_intensity text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname =
            'daily_checkins_cardio_type_check'
    ) then
        alter table public.daily_checkins
            add constraint
                daily_checkins_cardio_type_check
            check (
                cardio_type is null
                or cardio_type in (
                    'walking',
                    'running_jogging',
                    'hiit_intervals',
                    'stair_stepper',
                    'cycling',
                    'elliptical_rowing',
                    'mixed',
                    'other'
                )
            );
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname =
            'daily_checkins_cardio_intensity_check'
    ) then
        alter table public.daily_checkins
            add constraint
                daily_checkins_cardio_intensity_check
            check (
                cardio_intensity is null
                or cardio_intensity in (
                    'easy',
                    'moderate',
                    'hard'
                )
            );
    end if;
end
$$;

comment on column
    public.daily_checkins.cardio_type
is
    'User-reported cardio modality/category for cardio performed that review day.';

comment on column
    public.daily_checkins.cardio_intensity
is
    'User-reported perceived cardio effort: easy, moderate, or hard.';
