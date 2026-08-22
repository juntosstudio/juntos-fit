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

export function formatPlanAdjustmentAction(actionId) {
  return (
    ACTION_LABELS[actionId] ??
    'Review your next-week prescription'
  )
}

export function formatPlanAdjustmentStatus(status) {
  return STATUS_LABELS[status] ?? 'Plan Adjustment'
}

export function isPlanAdjustmentOpen(proposal) {
  return proposal?.status === 'proposed'
}

export function isHoldPlanAdjustment(proposal) {
  return (
    proposal?.decision_type === 'hold' ||
    proposal?.action_id === 'hold'
  )
}

export function getPlanAdjustmentHandoffState(proposal) {
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

  if (status === 'expired') {
    return {
      state: 'expired',
      eyebrow: 'Plan adjustment · Expired',
      title: 'Recommendation expired',
      description:
        'This recommendation is no longer actionable, but you can still view it as part of this week’s coaching history.',
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
    eyebrow: 'Next week',
    title: 'Plan Adjustment',
    description:
      'Review Juntos Coach’s recommendation, discuss it if you want, and explicitly accept or decline it. Nothing changes until you accept.',
    buttonLabel: 'Review Plan Adjustment',
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
