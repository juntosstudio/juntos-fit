-- Replaces the original workout-status constraint with the current allowed values.

alter table public.daily_checkins
  drop constraint if exists daily_checkins_workout_status_valid;

alter table public.daily_checkins
  drop constraint if exists daily_checkins_workout_status_check;

alter table public.daily_checkins
  add constraint daily_checkins_workout_status_valid
  check (
    workout_status is null
    or workout_status in (
      'completed',
      'partial',
      'missed',
      'rest_day'
    )
  );