alter table public.coaching_plan_targets
  add column daily_water_goal_oz integer;

update public.coaching_plan_targets
set daily_water_goal_oz = 80
where daily_water_goal_oz is null;

alter table public.coaching_plan_targets
  alter column daily_water_goal_oz set not null;

alter table public.coaching_plan_targets
  add constraint coaching_plan_targets_water_goal_check
  check (daily_water_goal_oz > 0);


alter table public.daily_checkins
  add column review_date date,
  add column meal_plan_deviation_details text,
  add column planned_cheat_meal_status text,
  add column hunger_score smallint,
  add column water_goal_met boolean,
  add column workout_incomplete_reason text,
  add column training_problem boolean,
  add column alcohol_consumed boolean,
  add column additional_notes text;

-- Existing rows, if any, review the calendar day before the check-in.
update public.daily_checkins
set review_date = checkin_date - 1
where review_date is null;

alter table public.daily_checkins
  alter column review_date set not null;

alter table public.daily_checkins
  add constraint daily_checkins_review_date_check
  check (review_date = checkin_date - 1);

alter table public.daily_checkins
  add constraint daily_checkins_cheat_meal_status_check
  check (
    planned_cheat_meal_status is null
    or planned_cheat_meal_status in (
      'eaten',
      'not_eaten',
      'not_planned'
    )
  );

alter table public.daily_checkins
  add constraint daily_checkins_hunger_score_check
  check (
    hunger_score is null
    or hunger_score between 1 and 5
  );

-- Replace the old yes/no hunger field with the 1–5 scale.
alter table public.daily_checkins
  drop column hunger;

-- Give the existing training notes column a clearer purpose.
alter table public.daily_checkins
  rename column training_problems
  to training_problem_details;

-- Allow partially completed workouts.
alter table public.daily_checkins
  drop constraint if exists daily_checkins_workout_status_check;

alter table public.daily_checkins
  add constraint daily_checkins_workout_status_check
  check (
    workout_status is null
    or workout_status in (
      'completed',
      'partial',
      'missed',
      'rest_day'
    )
  );