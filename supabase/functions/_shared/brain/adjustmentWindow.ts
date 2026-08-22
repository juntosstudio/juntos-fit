export const PLAN_ADJUSTMENT_WINDOW_HOURS = 24
export const PLAN_ADJUSTMENT_WINDOW_MS =
  PLAN_ADJUSTMENT_WINDOW_HOURS * 60 * 60 * 1000

function toValidMs(value: unknown) {
  if (!value) {
    return null
  }

  const ms = Date.parse(String(value))
  return Number.isFinite(ms) ? ms : null
}

export function resolveAdjustmentWindowDeadline({
  expiresAt,
  weeklySubmittedAt,
}: {
  expiresAt?: string | null
  weeklySubmittedAt?: string | null
}) {
  const explicitMs = toValidMs(expiresAt)

  if (explicitMs !== null) {
    return new Date(explicitMs).toISOString()
  }

  const submittedMs = toValidMs(weeklySubmittedAt)

  if (submittedMs === null) {
    return null
  }

  return new Date(
    submittedMs + PLAN_ADJUSTMENT_WINDOW_MS,
  ).toISOString()
}

export function isAdjustmentWindowExpired({
  expiresAt,
  weeklySubmittedAt,
  now = Date.now(),
}: {
  expiresAt?: string | null
  weeklySubmittedAt?: string | null
  now?: string | number | Date
}) {
  const deadline = resolveAdjustmentWindowDeadline({
    expiresAt,
    weeklySubmittedAt,
  })

  if (!deadline) {
    // A completed Weekly should always have submitted_at. Missing timing
    // data fails closed rather than leaving an adjustment open forever.
    return true
  }

  const nowMs =
    now instanceof Date
      ? now.getTime()
      : typeof now === 'number'
        ? now
        : Date.parse(String(now))

  return (
    !Number.isFinite(nowMs) ||
    nowMs >= Date.parse(deadline)
  )
}
