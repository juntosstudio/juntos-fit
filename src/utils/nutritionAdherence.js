export const NUTRITION_ADHERENCE_POLICY_VERSION =
  'meal_plan_self_report_v1'

export const DAILY_MEAL_PLAN_ADHERENCE = Object.freeze({
  5: 100,
  4: 95,
  3: 80,
  2: 60,
  1: 30,
})

export const NUTRITION_ADHERENCE_THRESHOLDS =
  Object.freeze({
    strong: 85,
    usable: 80,
    minimumCoverage: 80,
  })

function hasText(value) {
  return String(value ?? '').trim().length > 0
}

export function isPlannedCheatMealOnly(row) {
  const score = Number(row?.meal_plan_score)

  return (
    Number.isFinite(score) &&
    score >= 1 &&
    score <= 4 &&
    row?.planned_cheat_meal_status === 'eaten' &&
    !hasText(row?.meal_plan_deviation_details)
  )
}

export function getDailyNutritionAdherencePercent(row) {
  const score = Number(row?.meal_plan_score)

  if (!Number.isFinite(score)) {
    return null
  }

  if (isPlannedCheatMealOnly(row)) {
    return 100
  }

  return DAILY_MEAL_PLAN_ADHERENCE[score] ?? null
}

function roundPercent(value) {
  return Math.round(Math.min(100, Math.max(0, value)))
}

export function getNutritionAdherenceBand({
  adherencePercent,
  coveragePercent = 100,
}) {
  if (!Number.isFinite(Number(adherencePercent))) {
    return 'insufficient_data'
  }

  const adherence = Number(adherencePercent)
  const coverage = Number(coveragePercent)

  if (
    !Number.isFinite(coverage) ||
    coverage <
      NUTRITION_ADHERENCE_THRESHOLDS.minimumCoverage
  ) {
    return 'limited_data'
  }

  if (
    adherence >=
    NUTRITION_ADHERENCE_THRESHOLDS.strong
  ) {
    return 'strong'
  }

  if (
    adherence >=
    NUTRITION_ADHERENCE_THRESHOLDS.usable
  ) {
    return 'usable'
  }

  return 'needs_attention'
}

export function calculateNutritionAdherence(
  rows,
  { expectedDays = 7 } = {},
) {
  const safeRows = Array.isArray(rows)
    ? rows
    : []

  const dailyScores = safeRows
    .map((row) => ({
      checkinDate: row?.checkin_date ?? null,
      adherencePercent:
        getDailyNutritionAdherencePercent(row),
      plannedCheatMealOnly:
        isPlannedCheatMealOnly(row),
    }))
    .filter((item) =>
      Number.isFinite(item.adherencePercent),
    )

  const daysReported = dailyScores.length
  const normalizedExpectedDays = Math.max(
    0,
    Number.isFinite(Number(expectedDays))
      ? Math.round(Number(expectedDays))
      : 0,
  )

  const adherencePercent =
    daysReported > 0
      ? roundPercent(
          dailyScores.reduce(
            (total, item) =>
              total + item.adherencePercent,
            0,
          ) / daysReported,
        )
      : null

  const coveragePercent =
    normalizedExpectedDays > 0
      ? roundPercent(
          (daysReported /
            normalizedExpectedDays) *
            100,
        )
      : daysReported > 0
        ? 100
        : 0

  const band = getNutritionAdherenceBand({
    adherencePercent,
    coveragePercent,
  })

  return {
    policyVersion:
      NUTRITION_ADHERENCE_POLICY_VERSION,
    adherencePercent,
    daysReported,
    expectedDays: normalizedExpectedDays,
    coveragePercent,
    band,
    dataConfidence:
      band === 'insufficient_data' ||
      band === 'limited_data'
        ? 'limited'
        : 'good',
    dailyScores,
  }
}
