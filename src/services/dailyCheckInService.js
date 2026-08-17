import { supabase } from '../lib/supabase'
import {
  addDays,
  getTodayDateKey,
} from '../utils/dates'

export const DAILY_CHECKIN_FIELDS = `
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
  updated_at,
  edited_at
`


const DAILY_DRAFT_FIELDS = `
  id,
  coaching_plan_id,
  checkin_date,
  draft_data,
  resume_step,
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

export async function loadDailyCheckInDraft(
  coachingPlanId,
  checkinDate,
) {
  if (!coachingPlanId || !checkinDate) {
    return null
  }

  const { data, error } = await supabase
    .from('daily_checkin_drafts')
    .select(DAILY_DRAFT_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .eq('checkin_date', checkinDate)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function saveDailyCheckInDraft(
  coachingPlanId,
  checkinDate,
  {
    form,
    resumeStep,
  },
) {
  if (!coachingPlanId || !checkinDate) {
    throw new Error(
      'A coaching plan and Daily Check-In date are required.',
    )
  }

  const today = getTodayDateKey()

  if (checkinDate !== today) {
    throw new Error(
      'Only today’s Daily Check-In may be autosaved.',
    )
  }

  const values = {
    coaching_plan_id: coachingPlanId,
    checkin_date: checkinDate,
    draft_data: form ?? {},
    resume_step: resumeStep ?? null,
  }

  const { data, error } = await supabase
    .from('daily_checkin_drafts')
    .upsert(values, {
      onConflict: 'coaching_plan_id,checkin_date',
    })
    .select(DAILY_DRAFT_FIELDS)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteDailyCheckInDraft(
  coachingPlanId,
  checkinDate,
) {
  if (!coachingPlanId || !checkinDate) {
    return
  }

  const { error } = await supabase
    .from('daily_checkin_drafts')
    .delete()
    .eq('coaching_plan_id', coachingPlanId)
    .eq('checkin_date', checkinDate)

  if (error) {
    throw error
  }
}

export async function loadDailyCheckInForDate(
  coachingPlanId,
  checkinDate,
) {
  if (!coachingPlanId || !checkinDate) {
    return null
  }

  const { data, error } = await supabase
    .from('daily_checkins')
    .select(DAILY_CHECKIN_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .eq('checkin_date', checkinDate)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

// Saves one explicit Daily Check-In date. The caller is responsible
// for enforcing whether that historical date is still eligible.
export async function saveDailyCheckInForDate(
  checkinDate,
  checkin,
) {
  if (!checkin?.coaching_plan_id) {
    throw new Error('A coaching plan is required.')
  }

  if (!checkinDate) {
    throw new Error('A Daily Check-In date is required.')
  }

  const today = getTodayDateKey()

  if (checkinDate > today) {
    throw new Error(
      'A future Daily Check-In cannot be saved.',
    )
  }

  const datedCheckIn = {
    ...checkin,
    checkin_date: checkinDate,
    review_date: addDays(checkinDate, -1),
  }

  debug('Saving dated daily check-in.', datedCheckIn)

  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert(datedCheckIn, {
      onConflict: 'coaching_plan_id,checkin_date',
    })
    .select(DAILY_CHECKIN_FIELDS)
    .single()

  if (error) {
    throw error
  }

  debug('Dated daily check-in saved.', data)

  return data
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

  const data = await loadDailyCheckInForDate(
    coachingPlanId,
    today,
  )

  debug('Today’s daily check-in loaded.', data)

  return data
}

// Inserts or updates only today's check-in.
export async function saveTodayDailyCheckIn(checkin) {
  const today = getTodayDateKey()

  if (!checkin?.coaching_plan_id) {
    throw new Error('A coaching plan is required.')
  }

  // Reject accidental attempts to save another calendar date
  // through the today-only wrapper.
  if (
    checkin.checkin_date &&
    checkin.checkin_date !== today
  ) {
    throw new Error(
      'Only today’s daily check-in may be changed.',
    )
  }

  return saveDailyCheckInForDate(
    today,
    checkin,
  )
}
