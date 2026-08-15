import { supabase } from '../lib/supabase'

const WEEKLY_COACH_REVIEW_FIELDS = `
  id,
  user_id,
  coaching_plan_id,
  weekly_checkin_id,
  status,
  protocol_version,
  rules_version,
  model,
  reasoning_effort,
  assessment,
  confidence,
  how_your_week_went,
  what_im_seeing,
  this_weeks_focus,
  watch_items,
  prescription_action,
  input_hash,
  generation_count,
  generated_at,
  finalized_at,
  created_at,
  updated_at
`

export async function loadWeeklyCoachReview(
  weeklyCheckInId,
) {
  if (!weeklyCheckInId) {
    return null
  }

  const { data, error } = await supabase
    .from('weekly_coach_reviews')
    .select(WEEKLY_COACH_REVIEW_FIELDS)
    .eq(
      'weekly_checkin_id',
      weeklyCheckInId,
    )
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ?? null
}

export async function generateWeeklyCoachReview(
  weeklyCheckInId,
) {
  if (!weeklyCheckInId) {
    throw new Error(
      'A completed Weekly Check-In is required.',
    )
  }

  const { data, error } =
    await supabase.functions.invoke(
      'generate-weekly-coach-review',
      {
        body: {
          weekly_checkin_id:
            weeklyCheckInId,
        },
      },
    )

  if (error) {
    let message =
      'Juntos Coach could not generate this review right now.'

    try {
      const details =
        await error.context?.json?.()

      if (details?.error) {
        message = details.error
      }
    } catch {
      // Keep the user-safe fallback message.
    }

    throw new Error(message)
  }

  if (!data?.review) {
    throw new Error(
      'Juntos Coach did not return a review.',
    )
  }

  return data.review
}
