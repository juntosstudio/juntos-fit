alter table public.coaching_plan_targets
add column weekly_workout_target integer;

alter table public.coaching_plan_targets
add constraint coaching_plan_targets_weekly_workout_target_nonnegative
check (
  weekly_workout_target is null
  or weekly_workout_target >= 0
);

comment on column public.coaching_plan_targets.weekly_workout_target
is 'Number of planned workouts per program week.';