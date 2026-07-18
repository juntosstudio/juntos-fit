import { supabase } from '../lib/supabase'
import {
  addDays,
  getTodayDateKey,
} from '../utils/dates'

const DAILY_CHECKIN_FIELDS = `
  id,
  coaching_plan_id,
  checkin_date,
  review_date,
  morning_weight,
  weight_status,
  meal_plan_score,
  meal_plan_deviation_details,
  planned_cheat_meal_status,
  hunger_score,
  water_goal_met,
  workout_status,
  workout_incomplete_reason,
  training_problem,
  training_problem_details,
  cardio_minutes,
  alcohol_consumed,
  alcohol_details,
  additional_notes,
  questions_for_coach,
  created_at,
  updated_at
`

// Writes useful details to the console during development.
function debug(message, data = undefined) {
  if (import.meta.env.DEV) {
    console.debug(
      `[dailyCheckInService] ${message}`,
      data ?? '',
    )
  }
}

// Loads only today's check-in for the active coaching plan.
export async function loadTodayDailyCheckIn(
  coachingPlanId,
) {
  const today = getTodayDateKey()

  debug('Loading today’s daily check-in.', {
    coachingPlanId,
    today,
  })

  const { data, error } = await supabase
    .from('daily_checkins')
    .select(DAILY_CHECKIN_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .eq('checkin_date', today)
    .maybeSingle()

  if (error) {
    throw error
  }

  debug('Today’s daily check-in loaded.', data)

  return data
}

// Inserts or updates only today's check-in.
export async function saveTodayDailyCheckIn(checkin) {
  const today = getTodayDateKey()
  const yesterday = addDays(today, -1)

  if (!checkin?.coaching_plan_id) {
    throw new Error('A coaching plan is required.')
  }

  // Reject accidental attempts to save another calendar date.
  if (
    checkin.checkin_date &&
    checkin.checkin_date !== today
  ) {
    throw new Error(
      'Only today’s daily check-in may be changed.',
    )
  }

  const todayCheckin = {
    ...checkin,
    checkin_date: today,
    review_date: yesterday,
  }

  debug('Saving today’s daily check-in.', todayCheckin)

  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert(todayCheckin, {
      onConflict: 'coaching_plan_id,checkin_date',
    })
    .select(DAILY_CHECKIN_FIELDS)
    .single()

  if (error) {
    throw error
  }

  debug('Today’s daily check-in saved.', data)

  return data
}