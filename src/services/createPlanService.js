import { supabase } from '../lib/supabase'

// Creates one active plan and its initial target record.
export async function createCoachingPlan(
  userId,
  plan,
) {
  if (!userId) {
    throw new Error(
      'You must be signed in to create a plan.',
    )
  }

  const { data: planId, error } =
    await supabase.rpc(
      'create_coaching_plan_with_targets',
      {
        p_start_date: plan.start_date,
        p_checkin_day: Number(
          plan.checkin_day,
        ),
        p_program_length_weeks: Number(
          plan.program_length_weeks,
        ),
        p_goal: plan.goal,
        p_body_fat_source:
          plan.body_fat_source,
        p_unit_system: plan.unit_system,
        p_time_zone: plan.time_zone,
        p_measurement_frequency_weeks:
          Number(
            plan.measurement_frequency_weeks,
          ),
        p_photo_frequency_weeks: Number(
          plan.photo_frequency_weeks,
        ),
        p_calorie_target: Number(
          plan.calorie_target,
        ),
        p_protein_grams: Number(
          plan.protein_grams,
        ),
        p_carb_grams: Number(
          plan.carb_grams,
        ),
        p_fat_grams: Number(
          plan.fat_grams,
        ),
        p_weekly_cardio_target_minutes:
          Number(
            plan.weekly_cardio_target_minutes,
          ),
        p_weekly_workout_target: Number(
          plan.weekly_workout_target,
        ),
        p_daily_water_goal_oz: Number(
          plan.daily_water_goal_oz,
        ),
      },
    )

  if (error) {
    throw error
  }

  return planId
}
