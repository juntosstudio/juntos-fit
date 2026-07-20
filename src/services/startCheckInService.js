import { supabase } from '../lib/supabase'
import { getTodayDateKey } from '../utils/dates'

const START_CHECKIN_FIELDS = `
  id,
  coaching_plan_id,
  checkin_date,
  status,
  starting_weight_lbs,
  body_fat_percent,
  body_fat_status,
  body_fat_method,
  body_fat_formula_version,
  neck_inches,
  chest_inches,
  waist_inches,
  hips_inches,
  upper_arm_inches,
  thigh_inches,
  calf_inches,
  measurement_protocol_version,
  completed_at,
  created_at,
  updated_at
`

const MEASUREMENT_FIELDS = [
  'starting_weight_lbs',
  'body_fat_percent',
  'neck_inches',
  'chest_inches',
  'waist_inches',
  'hips_inches',
  'upper_arm_inches',
  'thigh_inches',
  'calf_inches',
]

function debug(message, data = undefined) {
  if (import.meta.env.DEV) {
    console.debug(
      `[startCheckInService] ${message}`,
      data ?? '',
    )
  }
}

function nullableNumber(value) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null
  }

  const number = Number(value)

  if (!Number.isFinite(number)) {
    throw new Error(
      'Measurements must contain valid numbers.',
    )
  }

  return number
}

// Loads profile fields needed by the Juntos Fit estimate.
export async function loadBodyFatProfile(userId) {
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, date_of_birth, sex, height_cm, unit_system, time_zone',
    )
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data
}

// Loads the plan's existing draft or completed Start Check-In.
export async function loadStartCheckIn(
  coachingPlanId,
) {
  if (!coachingPlanId) {
    throw new Error('A coaching plan is required.')
  }

  const { data, error } = await supabase
    .from('start_checkins')
    .select(START_CHECKIN_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

// Creates the plan's draft once.
export async function createStartCheckInDraft(
  coachingPlanId,
  checkinDate = getTodayDateKey(),
) {
  const existing =
    await loadStartCheckIn(coachingPlanId)

  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from('start_checkins')
    .insert({
      coaching_plan_id: coachingPlanId,
      checkin_date: checkinDate,
      status: 'draft',
    })
    .select(START_CHECKIN_FIELDS)
    .single()

  if (error?.code === '23505') {
    return loadStartCheckIn(coachingPlanId)
  }

  if (error) {
    throw error
  }

  return data
}

// Saves the one side used throughout the coaching plan.
export async function savePlanMeasurementPreferences(
  coachingPlanId,
  {
    measurementSide,
    timeZone,
  },
) {
  if (
    !coachingPlanId ||
    !['left', 'right'].includes(
      measurementSide,
    )
  ) {
    throw new Error(
      'Choose the left or right side.',
    )
  }

  const updates = {
    measurement_side: measurementSide,
  }

  if (timeZone) {
    updates.time_zone = timeZone
  }

  const { data, error } = await supabase
    .from('coaching_plans')
    .update(updates)
    .eq('id', coachingPlanId)
    .select(
      'id, measurement_side, time_zone',
    )
    .single()

  if (error) {
    throw error
  }

  return data
}

// Saves the baseline fields without changing completion status.
export async function saveStartCheckInMeasurements(
  startCheckInId,
  values,
) {
  if (!startCheckInId) {
    throw new Error(
      'A Start Check-In is required.',
    )
  }

  const updates = {}

  for (const field of MEASUREMENT_FIELDS) {
    if (field in values) {
      updates[field] = nullableNumber(
        values[field],
      )
    }
  }

  for (const field of [
    'body_fat_status',
    'body_fat_method',
    'body_fat_formula_version',
  ]) {
    if (field in values) {
      updates[field] = values[field] || null
    }
  }

  const { data, error } = await supabase
    .from('start_checkins')
    .update(updates)
    .eq('id', startCheckInId)
    .select(START_CHECKIN_FIELDS)
    .single()

  if (error) {
    throw error
  }

  debug('Start Check-In measurements saved.', data)

  return data
}

// Marks the Start Check-In complete after database validation.
export async function completeStartCheckIn(
  startCheckInId,
) {
  const { data, error } = await supabase
    .from('start_checkins')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', startCheckInId)
    .select(START_CHECKIN_FIELDS)
    .single()

  if (error) {
    throw error
  }

  return data
}
