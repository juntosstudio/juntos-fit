import { supabase } from '../lib/supabase'

const WEEKLY_CHECKIN_FIELDS = `
  id,
  user_id,
  daily_checkin_id,
  coaching_plan_id,
  checkin_date,
  week_number,
  status,
  submitted_at,
  draft_data,
  resume_step,
  photos_required,
  measurement_side,
  neck,
  chest,
  waist,
  hips,
  right_arm,
  left_arm,
  right_thigh,
  left_thigh,
  right_calf,
  left_calf,
  scale_body_fat,
  body_fat_percent,
  body_fat_source,
  body_fat_method,
  sleep_quality,
  energy_level,
  recovery_score,
  stress_level,
  menstrual_cycle_context,
  weekly_reflection,
  questions_for_coach,
  created_at,
  updated_at
`

function debug(message, data = undefined) {
  if (import.meta.env.DEV) {
    console.debug(
      `[weeklyCheckInService] ${message}`,
      data ?? '',
    )
  }
}

export async function loadWeeklyCheckIn(
  coachingPlanId,
  weekNumber,
) {
  if (!coachingPlanId || !weekNumber) {
    return null
  }

  const { data, error } = await supabase
    .from('weekly_checkins')
    .select(WEEKLY_CHECKIN_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .eq('week_number', weekNumber)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function createWeeklyCheckInDraft({
  userId,
  coachingPlanId,
  checkinDate,
  weekNumber,
  photosRequired,
  bodyFatSource,
}) {
  const existing =
    await loadWeeklyCheckIn(
      coachingPlanId,
      weekNumber,
    )

  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from('weekly_checkins')
    .insert({
      user_id: userId,
      coaching_plan_id: coachingPlanId,
      checkin_date: checkinDate,
      week_number: weekNumber,
      status: 'draft',
      submitted_at: null,
      daily_checkin_id: null,
      draft_data: {},
      resume_step: null,
      photos_required:
        Boolean(photosRequired),
      body_fat_source:
        bodyFatSource || 'none',
    })
    .select(WEEKLY_CHECKIN_FIELDS)
    .single()

  if (error?.code === '23505') {
    return loadWeeklyCheckIn(
      coachingPlanId,
      weekNumber,
    )
  }

  if (error) {
    throw error
  }

  debug('Weekly draft created.', data)

  return data
}

export async function saveWeeklyCheckInDraft(
  weeklyCheckInId,
  {
    form,
    resumeStep,
    photosRequired,
    bodyFatSource,
  },
) {
  if (!weeklyCheckInId) {
    throw new Error(
      'A Weekly Check-In draft is required.',
    )
  }

  const { data, error } = await supabase
    .from('weekly_checkins')
    .update({
      draft_data: form ?? {},
      resume_step: resumeStep || null,
      photos_required:
        Boolean(photosRequired),
      body_fat_source:
        bodyFatSource || 'none',
    })
    .eq('id', weeklyCheckInId)
    .eq('status', 'draft')
    .select(WEEKLY_CHECKIN_FIELDS)
    .single()

  if (error) {
    throw error
  }

  debug('Weekly draft autosaved.', {
    weeklyCheckInId,
    resumeStep,
  })

  return data
}

export async function completeWeeklyCheckIn(
  weeklyCheckInId,
  {
    dailyCheckInId,
    form,
    structuredValues,
  },
) {
  if (!weeklyCheckInId || !dailyCheckInId) {
    throw new Error(
      'Weekly and Daily Check-Ins are required to submit.',
    )
  }

  const { data, error } = await supabase
    .from('weekly_checkins')
    .update({
      ...structuredValues,
      daily_checkin_id: dailyCheckInId,
      draft_data: form ?? {},
      resume_step: null,
      status: 'completed',
      submitted_at:
        new Date().toISOString(),
    })
    .eq('id', weeklyCheckInId)
    .eq('status', 'draft')
    .select(WEEKLY_CHECKIN_FIELDS)
    .single()

  if (error) {
    throw error
  }

  debug('Weekly Check-In submitted.', data)

  return data
}
