const ACTION_LABELS = {
  hold: 'Keep your current prescription',
  nutrition_decrease_100: 'Reduce calories by 100 per day',
  nutrition_increase_100: 'Increase calories by 100 per day',
  cardio_increase_60_to_75: 'Increase cardio to 75 minutes per week',
  cardio_increase_75_to_90: 'Increase cardio to 90 minutes per week',
  cardio_increase_intensity_to_moderate:
    'Increase cardio intensity to moderate',
  calorie_reset_increase_100:
    'Start Calorie Reset with 100 more calories per day',
}

const STATUS_LABELS = {
  proposed: 'Ready for your decision',
  accepted: 'Accepted',
  declined: 'Declined',
  superseded: 'Revised',
  expired: 'Expired',
}

export const PLAN_ADJUSTMENT_WINDOW_HOURS = 24
const PLAN_ADJUSTMENT_WINDOW_MS =
  PLAN_ADJUSTMENT_WINDOW_HOURS * 60 * 60 * 1000

function validTimestamp(value) {
  if (!value) {
    return null
  }

  const ms = Date.parse(String(value))
  return Number.isFinite(ms) ? ms : null
}

export function getPlanAdjustmentDeadline({
  proposal,
  weeklySubmittedAt,
} = {}) {
  const explicit = validTimestamp(
    proposal?.expires_at,
  )

  if (explicit !== null) {
    return new Date(explicit).toISOString()
  }

  const submitted = validTimestamp(
    weeklySubmittedAt,
  )

  if (submitted === null) {
    return null
  }

  return new Date(
    submitted + PLAN_ADJUSTMENT_WINDOW_MS,
  ).toISOString()
}

export function isPlanAdjustmentWindowExpired({
  proposal,
  weeklySubmittedAt,
  now = Date.now(),
} = {}) {
  if (proposal?.status === 'expired') {
    return true
  }

  const deadline = getPlanAdjustmentDeadline({
    proposal,
    weeklySubmittedAt,
  })

  if (!deadline) {
    return false
  }

  const nowMs =
    now instanceof Date
      ? now.getTime()
      : typeof now === 'number'
        ? now
        : Date.parse(String(now))

  return (
    Number.isFinite(nowMs) &&
    nowMs >= Date.parse(deadline)
  )
}

export function formatPlanAdjustmentAction(actionId) {
  return (
    ACTION_LABELS[actionId] ??
    'Review your next-week prescription'
  )
}

export function formatPlanAdjustmentStatus(status) {
  return STATUS_LABELS[status] ?? 'Plan Adjustment'
}

export function isPlanAdjustmentOpen(
  proposal,
  options = {},
) {
  return (
    proposal?.status === 'proposed' &&
    !isPlanAdjustmentWindowExpired({
      proposal,
      ...options,
    })
  )
}

export function isHoldPlanAdjustment(proposal) {
  return (
    proposal?.decision_type === 'hold' ||
    proposal?.action_id === 'hold'
  )
}

export function getPlanAdjustmentHandoffState(
  proposal,
  options = {},
) {
  const status = proposal?.status

  if (status === 'accepted') {
    if (isHoldPlanAdjustment(proposal)) {
      return {
        state: 'accepted',
        eyebrow: 'Plan adjustment · Accepted',
        title: 'Current prescription kept',
        description:
          'You reviewed and accepted Juntos Coach’s recommendation. Your current prescription stays in place.',
        buttonLabel: 'View Plan Adjustment',
      }
    }

    return {
      state: 'accepted',
      eyebrow: 'Plan adjustment · Accepted',
      title: 'Prescription update accepted',
      description:
        'You accepted Juntos Coach’s recommendation. View the finalized prescription and effective date.',
      buttonLabel: 'View Plan Adjustment',
    }
  }

  if (status === 'declined') {
    return {
      state: 'declined',
      eyebrow: 'Plan adjustment · Declined',
      title: 'Recommendation declined',
      description:
        'You declined this recommendation. Your current prescription remains in place.',
      buttonLabel: 'View Plan Adjustment',
    }
  }

  if (
    status === 'expired' ||
    isPlanAdjustmentWindowExpired({
      proposal,
      ...options,
    })
  ) {
    if (!proposal) {
      return {
        state: 'expired',
        eyebrow: 'Plan adjustment · Closed',
        title: 'Adjustment window closed',
        description:
          'The 24-hour decision window for this week has closed. Your prescription stayed unchanged and the next Weekly Check-In will create a fresh coaching decision.',
        buttonLabel: null,
      }
    }

    return {
      state: 'expired',
      eyebrow: 'Plan adjustment · Expired',
      title: 'Recommendation expired',
      description:
        'The 24-hour decision window has closed. This recommendation is view-only and cannot change the current week.',
      buttonLabel: 'View Plan Adjustment',
    }
  }

  if (status === 'superseded') {
    return {
      state: 'superseded',
      eyebrow: 'Plan adjustment · Revised',
      title: 'Recommendation revised',
      description:
        'This recommendation was replaced by a newer revision. Open Plan Adjustment to review the coaching history.',
      buttonLabel: 'View Plan Adjustment',
    }
  }

  return {
    state: 'pending',
    eyebrow: 'Next step',
    title: 'Juntos Coach Recommendation',
    description:
      'Review the recommendation for next week. You can accept it now or discuss it with Juntos Coach. Nothing changes unless you accept.',
    buttonLabel: 'Discuss With Coach',
  }
}

export function findPendingPlanAdjustmentTurn(messages) {
  const rows = Array.isArray(messages) ? messages : []
  const repliedUserIds = new Set(
    rows
      .filter((message) => message?.role === 'coach')
      .map((message) => message?.in_reply_to_message_id)
      .filter(Boolean),
  )

  return (
    [...rows]
      .reverse()
      .find(
        (message) =>
          message?.role === 'user' &&
          message?.id &&
          message?.client_message_id &&
          !repliedUserIds.has(message.id),
      ) ?? null
  )
}

export function formatCardioIntensity(value) {
  if (!value) {
    return null
  }

  return `${String(value).charAt(0).toUpperCase()}${String(value).slice(1)}`
}
