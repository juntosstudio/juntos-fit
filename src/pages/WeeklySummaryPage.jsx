import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  loadCompletedWeeklyCheckIns,
  loadWeeklySummary,
  loadWeeklySummaryPreview,
} from '../services/weeklySummaryService'
import {
  generateWeeklyCoachReview,
} from '../services/weeklyCoachService'
import {
  formatDate,
} from '../utils/formatters'
import {
  dateKeyToUtcMilliseconds,
  getTodayDateKey,
} from '../utils/dates'
import {
  fromCanonicalMeasurement,
  getMeasurementUnit,
  normalizeUnitSystem,
} from '../utils/measurementUnits'
import '../styles/weeklySummary.css'
import '../styles/weeklyCoachReview.css'

const RECOVERY_LABELS = {
  sleep_quality: {
    1: 'Poor',
    2: 'Below average',
    3: 'Okay',
    4: 'Good',
    5: 'Excellent',
  },
  energy_level: {
    1: 'Very low',
    2: 'Low',
    3: 'Moderate',
    4: 'Good',
    5: 'Excellent',
  },
  recovery_score: {
    1: 'Poorly recovered',
    2: 'Still very sore',
    3: 'Managing',
    4: 'Well recovered',
    5: 'Fully recovered',
  },
  stress_level: {
    1: 'Overwhelming',
    2: 'Difficult',
    3: 'Manageable',
    4: 'Mostly manageable',
    5: 'Very manageable',
  },
}

const MEAL_PLAN_LABELS = {
  1: 'Did not follow the plan',
  2: 'Significantly off plan',
  3: 'Several deviations',
  4: 'One small deviation',
  5: 'Followed exactly',
}

function numericValues(
  rows,
  field,
) {
  return rows
    .map((row) =>
      Number(row?.[field]),
    )
    .filter(Number.isFinite)
}

function average(values) {
  if (!values.length) {
    return null
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / values.length
  )
}

function formatNumber(
  value,
  digits = 1,
) {
  if (!Number.isFinite(Number(value))) {
    return '—'
  }

  return Number(value).toFixed(digits)
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) {
    return '—'
  }

  return `${Math.round(Number(value))}%`
}

function getAdherenceState(value) {
  if (!Number.isFinite(Number(value))) {
    return 'is-neutral'
  }

  if (Number(value) >= 80) {
    return 'is-positive'
  }

  if (Number(value) >= 60) {
    return 'is-watch'
  }

  return 'is-negative'
}

function getWeightOutcome(
  delta,
  goal,
) {
  if (!Number.isFinite(Number(delta))) {
    return 'is-neutral'
  }

  const numericDelta =
    Number(delta)

  if (Math.abs(numericDelta) < 0.1) {
    return goal === 'maintenance'
      ? 'is-positive'
      : 'is-neutral'
  }

  if (goal === 'fat_loss') {
    return numericDelta < 0
      ? 'is-positive'
      : 'is-negative'
  }

  if (goal === 'muscle_gain') {
    return numericDelta > 0
      ? 'is-positive'
      : 'is-negative'
  }

  // Maintenance: roughly stable is success.
  return Math.abs(numericDelta) <= 0.5
    ? 'is-positive'
    : 'is-negative'
}

function getWaistOutcome(delta) {
  if (!Number.isFinite(Number(delta))) {
    return 'is-neutral'
  }

  const numericDelta =
    Number(delta)

  if (Math.abs(numericDelta) < 0.05) {
    return 'is-neutral'
  }

  return numericDelta < 0
    ? 'is-positive'
    : 'is-negative'
}

function getArrow(delta) {
  if (!Number.isFinite(Number(delta))) {
    return '—'
  }

  if (Number(delta) < 0) {
    return '↓'
  }

  if (Number(delta) > 0) {
    return '↑'
  }

  return '→'
}

function convertCanonicalDelta(
  field,
  delta,
  unitSystem,
) {
  if (!Number.isFinite(Number(delta))) {
    return null
  }

  const numericDelta = Number(delta)

  if (unitSystem !== 'metric') {
    return numericDelta
  }

  if (field === 'starting_weight_lbs') {
    return numericDelta * 0.45359237
  }

  return numericDelta * 2.54
}

function formatDelta(
  delta,
  unit,
) {
  if (!Number.isFinite(Number(delta))) {
    return 'No comparison yet'
  }

  return (
    `${getArrow(delta)} ` +
    `${Math.abs(Number(delta)).toFixed(1)} ${unit}`
  )
}

function stablePrescriptionValue(
  prescriptions,
  field,
) {
  const values = [
    ...new Set(
      prescriptions
        .map((item) =>
          item?.[field],
        )
        .filter(
          (value) =>
            value !== null &&
            value !== undefined,
        )
        .map(String),
    ),
  ]

  if (values.length !== 1) {
    return null
  }

  return Number(values[0])
}

function displayRecovery(
  field,
  value,
) {
  if (!value) {
    return '—'
  }

  const label =
    RECOVERY_LABELS[field]?.[value]

  return label
    ? `${label} (${value}/5)`
    : `${value}/5`
}

function buildMealBreakdown(rows) {
  const result = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }

  for (const row of rows) {
    const score =
      Number(row.meal_plan_score)

    if (result[score] !== undefined) {
      result[score] += 1
    }
  }

  return result
}

function ResultDelta({
  field,
  delta,
  unit,
  unitSystem,
  state,
  compareLabel,
}) {
  const displayDelta =
    convertCanonicalDelta(
      field,
      delta,
      unitSystem,
    )

  return (
    <div className="weekly-result-delta">
      <span
        className={`weekly-result-arrow ${state}`}
        aria-hidden="true"
      >
        {getArrow(delta)}
      </span>

      <div>
        <strong className={state}>
          {formatDelta(
            displayDelta,
            unit,
          )}
        </strong>

        <small>{compareLabel}</small>
      </div>
    </div>
  )
}

function WeightSparkline({
  rows,
  state,
}) {
  const points = rows
    .map((row, index) => ({
      index,
      value: Number(
        row.morning_weight,
      ),
    }))
    .filter((point) =>
      Number.isFinite(point.value),
    )

  if (points.length < 2) {
    return (
      <div className="weekly-sparkline-empty">
        More daily weights will build your weekly trend.
      </div>
    )
  }

  const values =
    points.map(
      (point) => point.value,
    )

  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const span =
    Math.max(
      maximum - minimum,
      0.5,
    )

  const svgPoints = points
    .map((point) => {
      const x =
        8 +
        (point.index / 6) * 144

      const y =
        48 -
        ((point.value - minimum) /
          span) *
          38

      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      className={`weekly-weight-sparkline ${state}`}
      viewBox="0 0 160 56"
      role="img"
      aria-label="Daily weight trend for this week"
    >
      <polyline
        points={svgPoints}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function PrescriptionCard({
  prescription,
  showDates,
}) {
  return (
    <div className="weekly-prescription-version">
      {showDates && (
        <p className="weekly-prescription-dates">
          {formatDate(
            prescription.effective_from,
          )}
          {' – '}
          {formatDate(
            prescription.effective_to,
          )}
          {' · '}
          {prescription.days_in_effect}{' '}
          {Number(
            prescription.days_in_effect,
          ) === 1
            ? 'day'
            : 'days'}
        </p>
      )}

      <div className="weekly-prescription-calories">
        <strong>
          {prescription.calorie_target ??
            '—'}
        </strong>
        <span>Calories / day</span>
      </div>

      <div className="weekly-prescription-macros">
        <div>
          <strong>
            {prescription.protein_grams ??
              '—'}g
          </strong>
          <span>Protein</span>
        </div>

        <div>
          <strong>
            {prescription.carb_grams ??
              '—'}g
          </strong>
          <span>Carbs</span>
        </div>

        <div>
          <strong>
            {prescription.fat_grams ??
              '—'}g
          </strong>
          <span>Fat</span>
        </div>
      </div>

      <div className="weekly-prescription-activity">
        <span>
          <strong>
            {prescription.weekly_workout_target ??
              '—'}
          </strong>{' '}
          workouts / week
        </span>

        <span>
          <strong>
            {prescription
              .weekly_cardio_target_minutes ??
              '—'}
          </strong>{' '}
          cardio min / week
        </span>

        {prescription.daily_water_goal_oz !==
          null &&
          prescription.daily_water_goal_oz !==
            undefined && (
          <span>
            <strong>
              {prescription
                .daily_water_goal_oz}
            </strong>{' '}
            oz water / day
          </span>
        )}
      </div>
    </div>
  )
}

function formatCoachAssessment(value) {
  if (value === 'on_track') {
    return 'On Track'
  }

  if (value === 'needs_attention') {
    return 'Needs Attention'
  }

  return 'Watch'
}

function formatCoachConfidence(value) {
  if (value === 'high') {
    return 'High Confidence'
  }

  if (value === 'low') {
    return 'Low Confidence'
  }

  return 'Medium Confidence'
}

function CoachReviewCard({ review }) {
  return (
    <section className="weekly-coach-review">
      <div className="weekly-coach-review-header">
        <h2>Coach Review</h2>

        <div className="weekly-coach-review-meta">
          <span className="weekly-coach-pill">
            {formatCoachAssessment(
              review.assessment,
            )}
          </span>

          <span className="weekly-coach-pill">
            {formatCoachConfidence(
              review.confidence,
            )}
          </span>
        </div>
      </div>

      <div className="weekly-coach-block">
        <h3>How Your Week Went</h3>
        <p>{review.how_your_week_went}</p>
      </div>

      <div className="weekly-coach-block">
        <h3>What I’m Seeing</h3>
        <p>{review.what_im_seeing}</p>
      </div>

      <div className="weekly-coach-block">
        <h3>This Week’s Focus</h3>
        <ul className="weekly-coach-focus-list">
          {(review.this_weeks_focus ?? []).map(
            (item, index) => (
              <li key={`${index}-${item}`}>
                {item}
              </li>
            ),
          )}
        </ul>
      </div>

      {(review.watch_items ?? []).length > 0 && (
        <div className="weekly-coach-block">
          <h3>Watch Item</h3>
          <ul className="weekly-coach-watch-list">
            {review.watch_items.map(
              (item, index) => (
                <li key={`${index}-${item}`}>
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      <p className="weekly-coach-footnote">
        Brain Lite · {review.protocol_version}
        {' · '}Current prescription held
      </p>
    </section>
  )
}

function getDevPreviewWeekNumber(plan) {
  if (
    !import.meta.env.DEV ||
    !plan?.start_date
  ) {
    return null
  }

  const today =
    getTodayDateKey()

  if (today < plan.start_date) {
    return 1
  }

  const daysSinceStart =
    Math.floor(
      (dateKeyToUtcMilliseconds(
        today,
      ) -
        dateKeyToUtcMilliseconds(
          plan.start_date,
        )) /
        86400000,
    )

  const currentWeek =
    Math.floor(
      daysSinceStart / 7,
    ) + 1

  return Math.max(
    currentWeek - 1,
    1,
  )
}

export function WeeklySummaryPage({
  plan,
  profile,
  onBack,
  onOpenToday,
  onOpenHistory,
  onOpenPlan,
  onOpenSettings,
}) {
  const [completedWeeks, setCompletedWeeks] =
    useState([])
  const [selectedWeek, setSelectedWeek] =
    useState(null)
  const [summary, setSummary] =
    useState(null)
  const [loading, setLoading] =
    useState(true)
  const [error, setError] =
    useState('')
  const [coachReview, setCoachReview] =
    useState(null)
  const [coachLoading, setCoachLoading] =
    useState(false)
  const [coachError, setCoachError] =
    useState('')
  const coachAttempts = useRef(new Set())

  const unitSystem =
    normalizeUnitSystem(
      profile?.unit_system,
    )

  const devPreviewWeekNumber =
    getDevPreviewWeekNumber(plan)

  useEffect(() => {
    let cancelled = false

    async function loadWeeks() {
      if (!plan?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const weeks =
          await loadCompletedWeeklyCheckIns(
            plan.id,
          )

        if (cancelled) {
          return
        }

        setCompletedWeeks(weeks)

        setSelectedWeek(
          weeks[0]?.week_number ??
            devPreviewWeekNumber ??
            null,
        )
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              'Your Weekly Summaries could not be loaded.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadWeeks()

    return () => {
      cancelled = true
    }
  }, [
    plan?.id,
    devPreviewWeekNumber,
  ])

  useEffect(() => {
    let cancelled = false

    async function loadSelectedSummary() {
      if (
        !plan?.id ||
        !selectedWeek
      ) {
        setSummary(null)
        return
      }

      setLoading(true)
      setError('')
      setCoachReview(null)
      setCoachError('')
      setCoachLoading(false)

      try {
        const hasCompletedWeek =
          completedWeeks.some(
            (week) =>
              Number(
                week.week_number,
              ) ===
              Number(
                selectedWeek,
              ),
          )

        const nextSummary =
          hasCompletedWeek
            ? await loadWeeklySummary(
                plan,
                selectedWeek,
              )
            : await loadWeeklySummaryPreview(
                plan,
                selectedWeek,
              )

        if (!cancelled) {
          setSummary(nextSummary)
          setCoachReview(
            nextSummary?.coachReview ?? null,
          )
          setCoachError('')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              'This Weekly Summary could not be loaded.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSelectedSummary()

    return () => {
      cancelled = true
    }
  }, [
    plan,
    selectedWeek,
    completedWeeks,
  ])

  useEffect(() => {
    const weeklyCheckInId =
      summary?.week?.id

    if (
      !weeklyCheckInId ||
      summary?.preview ||
      summary?.coachReview
    ) {
      setCoachLoading(false)
      return undefined
    }

    if (
      coachAttempts.current.has(
        weeklyCheckInId,
      )
    ) {
      return undefined
    }

    let cancelled = false

    coachAttempts.current.add(
      weeklyCheckInId,
    )
    setCoachLoading(true)
    setCoachError('')

    generateWeeklyCoachReview(
      weeklyCheckInId,
    )
      .then((review) => {
        if (cancelled) {
          return
        }

        setCoachReview(review)
        setSummary((current) =>
          current
            ? {
                ...current,
                coachReview: review,
              }
            : current,
        )
      })
      .catch((generationError) => {
        if (cancelled) {
          return
        }

        setCoachError(
          generationError?.message ||
            'Juntos Coach could not generate this review right now.',
        )
      })
      .finally(() => {
        if (!cancelled) {
          setCoachLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    summary?.week?.id,
    summary?.preview,
    summary?.coachReview,
  ])

  async function retryCoachReview() {
    const weeklyCheckInId =
      summary?.week?.id

    if (
      !weeklyCheckInId ||
      summary?.preview ||
      coachLoading
    ) {
      return
    }

    setCoachLoading(true)
    setCoachError('')

    try {
      const review =
        await generateWeeklyCoachReview(
          weeklyCheckInId,
        )

      setCoachReview(review)
      setSummary((current) =>
        current
          ? {
              ...current,
              coachReview: review,
            }
          : current,
      )
    } catch (generationError) {
      setCoachError(
        generationError?.message ||
          'Juntos Coach could not generate this review right now.',
      )
    } finally {
      setCoachLoading(false)
    }
  }

  const calculations = useMemo(() => {
    if (!summary) {
      return null
    }

    const weightValues =
      numericValues(
        summary.dailyRows,
        'morning_weight',
      )

    const previousWeightValues =
      numericValues(
        summary.previousDailyRows,
        'morning_weight',
      )

    const weeklyAverageWeight =
      average(weightValues)

    const previousAverageWeight =
      average(
        previousWeightValues,
      )

    const startWeight =
      Number(
        summary.startCheckIn
          ?.starting_weight_lbs,
      )

    const weightComparison =
      Number.isFinite(
        previousAverageWeight,
      )
        ? previousAverageWeight
        : Number.isFinite(startWeight)
          ? startWeight
          : null

    const weightDelta =
      Number.isFinite(
        weeklyAverageWeight,
      ) &&
      Number.isFinite(
        weightComparison,
      )
        ? weeklyAverageWeight -
          weightComparison
        : null

    const weightCompareLabel =
      Number.isFinite(
        previousAverageWeight,
      )
        ? `vs Week ${
            Number(selectedWeek) - 1
          } average`
        : Number.isFinite(startWeight)
          ? 'vs Start Day'
          : 'No earlier weight comparison'

    const currentWaist =
      Number(summary.week.waist)

    const previousWaist =
      Number(
        summary.previousWeek?.waist,
      )

    const startWaist =
      Number(
        summary.startCheckIn
          ?.waist_inches,
      )

    const waistComparison =
      Number.isFinite(previousWaist)
        ? previousWaist
        : Number.isFinite(startWaist)
          ? startWaist
          : null

    const waistDelta =
      Number.isFinite(currentWaist) &&
      Number.isFinite(
        waistComparison,
      )
        ? currentWaist -
          waistComparison
        : null

    const waistCompareLabel =
      Number.isFinite(previousWaist)
        ? `vs Week ${
            Number(selectedWeek) - 1
          }`
        : Number.isFinite(startWaist)
          ? 'vs Start Day'
          : 'No earlier waist comparison'

    const mealScores =
      numericValues(
        summary.dailyRows,
        'meal_plan_score',
      )

    const averageMealScore =
      average(mealScores)

    const adherence =
      Number.isFinite(
        averageMealScore,
      )
        ? averageMealScore * 20
        : null

    const mealBreakdown =
      buildMealBreakdown(
        summary.dailyRows,
      )

    const workoutsCompleted =
      summary.dailyRows.filter(
        (row) =>
          row.workout_status ===
          'completed',
      ).length

    const workoutsPartial =
      summary.dailyRows.filter(
        (row) =>
          row.workout_status ===
          'partial',
      ).length

    const workoutsMissed =
      summary.dailyRows.filter(
        (row) =>
          row.workout_status ===
          'missed',
      ).length

    const cardioMinutes =
      summary.dailyRows.reduce(
        (total, row) =>
          total +
          (Number(
            row.cardio_minutes,
          ) || 0),
        0,
      )

    const waterTrackedDays =
      summary.dailyRows.filter(
        (row) =>
          row.water_goal_met !==
            null &&
          row.water_goal_met !==
            undefined,
      )

    const waterGoalDays =
      waterTrackedDays.filter(
        (row) =>
          row.water_goal_met ===
          true,
      ).length

    const alcoholTrackedDays =
      summary.dailyRows.filter(
        (row) =>
          row.alcohol_consumed !==
            null &&
          row.alcohol_consumed !==
            undefined,
      )

    const alcoholDays =
      alcoholTrackedDays.filter(
        (row) =>
          row.alcohol_consumed ===
          true,
      ).length

    const cheatMealDays =
      summary.dailyRows.filter(
        (row) =>
          row.planned_cheat_meal_status ===
          'eaten',
      ).length

    return {
      weeklyAverageWeight,
      weightDelta,
      weightCompareLabel,
      weightState:
        getWeightOutcome(
          weightDelta,
          plan.goal,
        ),

      currentWaist,
      waistDelta,
      waistCompareLabel,
      waistState:
        getWaistOutcome(
          waistDelta,
        ),

      adherence,
      adherenceState:
        getAdherenceState(
          adherence,
        ),
      mealBreakdown,
      daysReported:
        mealScores.length,
      cheatMealDays,

      workoutsCompleted,
      workoutsPartial,
      workoutsMissed,
      cardioMinutes,

      waterTrackedDays:
        waterTrackedDays.length,
      waterGoalDays,

      alcoholTrackedDays:
        alcoholTrackedDays.length,
      alcoholDays,

      stableWorkoutTarget:
        stablePrescriptionValue(
          summary.prescriptions,
          'weekly_workout_target',
        ),

      stableCardioTarget:
        stablePrescriptionValue(
          summary.prescriptions,
          'weekly_cardio_target_minutes',
        ),

      stableWaterTarget:
        stablePrescriptionValue(
          summary.prescriptions,
          'daily_water_goal_oz',
        ),
    }
  }, [
    plan?.goal,
    selectedWeek,
    summary,
  ])

  if (!plan) {
    return (
      <main className="container">
        <button
          type="button"
          onClick={onBack}
        >
          Back to Today
        </button>

        <h1>Weekly Summary</h1>

        <p>
          A coaching plan is required.
        </p>
      </main>
    )
  }

  if (
    loading &&
    completedWeeks.length === 0
  ) {
    return (
      <main className="container weekly-summary-page">
        <button
          type="button"
          className="text-button"
          onClick={onBack}
        >
          ← Back to Today
        </button>

        <h1>Weekly Summary</h1>
        <p>Loading your report card...</p>
      </main>
    )
  }

  if (
    !loading &&
    completedWeeks.length === 0 &&
    !devPreviewWeekNumber
  ) {
    return (
      <main className="container weekly-summary-page">
        <button
          type="button"
          className="text-button"
          onClick={onBack}
        >
          ← Back to Today
        </button>

        <h1>Weekly Summary</h1>

        <section className="weekly-summary-empty">
          <h2>Your first report card is coming.</h2>

          <p>
            Complete your first Weekly Check-In to
            unlock your first Weekly Summary.
          </p>
        </section>
      </main>
    )
  }

  return (
    <>
      <main className="container weekly-summary-page">
        <button
          type="button"
          className="text-button"
          onClick={onBack}
        >
          ← Back to Today
        </button>

      <header className="weekly-summary-header">
        <label
          htmlFor="weekly-summary-week"
          className="visually-hidden"
        >
          Choose Weekly Summary
        </label>

        <select
          id="weekly-summary-week"
          className="weekly-summary-selector"
          value={selectedWeek ?? ''}
          onChange={(event) =>
            setSelectedWeek(
              Number(
                event.target.value,
              ),
            )
          }
        >
          {completedWeeks.map(
            (week) => (
              <option
                key={week.id}
                value={week.week_number}
              >
                Week {week.week_number} Summary
              </option>
            ),
          )}

          {import.meta.env.DEV &&
            devPreviewWeekNumber &&
            !completedWeeks.some(
              (week) =>
                Number(
                  week.week_number,
                ) ===
                Number(
                  devPreviewWeekNumber,
                ),
            ) && (
              <option
                value={
                  devPreviewWeekNumber
                }
              >
                Week {devPreviewWeekNumber} Summary · DEV Preview
              </option>
            )}
        </select>

        {summary && (
          <p>
            {formatDate(
              summary.weekRange.weekStart,
            )}
            {' – '}
            {formatDate(
              summary.weekRange.weekEnd,
            )}
          </p>
        )}
      </header>

      {summary?.preview && (
        <p className="weekly-preview-badge">
          DEV Preview · Nothing will be saved
        </p>
      )}

      {summary?.preview && (
        <p className="weekly-data-note">
          This preview uses your real plan prescription
          and available Daily Check-In data. Weekly-only
          answers such as waist, sleep, recovery, stress,
          body fat, and reflection stay blank until a
          real Weekly Check-In is submitted.
        </p>
      )}

      {error && (
        <p role="alert">{error}</p>
      )}

      {loading && (
        <p className="weekly-summary-loading">
          Updating report card...
        </p>
      )}

      {summary && calculations && (
        <>
          <section className="weekly-summary-section">
            <h2>Results</h2>

            <div className="weekly-results-grid">
              <article className="weekly-result-card">
                <h3>Weight</h3>

                <strong className="weekly-result-value">
                  {Number.isFinite(
                    calculations
                      .weeklyAverageWeight,
                  )
                    ? `${formatNumber(
                        fromCanonicalMeasurement(
                          'starting_weight_lbs',
                          calculations
                            .weeklyAverageWeight,
                          unitSystem,
                        ),
                      )} ${getMeasurementUnit(
                        'starting_weight_lbs',
                        unitSystem,
                      )}`
                    : '—'}
                </strong>

                <span className="weekly-result-caption">
                  Weekly Average
                </span>

                <WeightSparkline
                  rows={summary.dailyRows}
                  state={
                    calculations.weightState
                  }
                />

                <ResultDelta
                  field="starting_weight_lbs"
                  delta={
                    calculations.weightDelta
                  }
                  unit={getMeasurementUnit(
                    'starting_weight_lbs',
                    unitSystem,
                  )}
                  unitSystem={unitSystem}
                  state={
                    calculations.weightState
                  }
                  compareLabel={
                    calculations
                      .weightCompareLabel
                  }
                />
              </article>

              <article className="weekly-result-card">
                <h3>Waist</h3>

                <strong className="weekly-result-value">
                  {Number.isFinite(
                    calculations.currentWaist,
                  )
                    ? `${formatNumber(
                        fromCanonicalMeasurement(
                          'waist_inches',
                          calculations
                            .currentWaist,
                          unitSystem,
                        ),
                      )} ${getMeasurementUnit(
                        'waist_inches',
                        unitSystem,
                      )}`
                    : '—'}
                </strong>

                <span className="weekly-result-caption">
                  Weekly Check-In
                </span>

                <div
                  className={`weekly-waist-visual ${calculations.waistState}`}
                  aria-hidden="true"
                >
                  {getArrow(
                    calculations.waistDelta,
                  )}
                </div>

                <ResultDelta
                  field="waist_inches"
                  delta={
                    calculations.waistDelta
                  }
                  unit={getMeasurementUnit(
                    'waist_inches',
                    unitSystem,
                  )}
                  unitSystem={unitSystem}
                  state={
                    calculations.waistState
                  }
                  compareLabel={
                    calculations
                      .waistCompareLabel
                  }
                />
              </article>
            </div>

            {Number.isFinite(
              Number(
                summary.week
                  .body_fat_percent,
              ),
            ) && (
              <p className="weekly-body-fat-note">
                Body Fat ·{' '}
                <strong>
                  {formatNumber(
                    summary.week
                      .body_fat_percent,
                  )}%
                </strong>
                {' · '}
                {summary.week
                  .body_fat_source ===
                'juntos_estimate'
                  ? `Juntos Estimate (${
                      summary.week
                        .body_fat_method ??
                      'RFM'
                    })`
                  : 'Scale'}
              </p>
            )}
          </section>

          <section className="weekly-summary-section">
            <h2>Your Prescription</h2>

            {summary.prescriptions.length ===
              0 && (
              <p>
                No saved prescription snapshot was
                found for this week.
              </p>
            )}

            <div className="weekly-prescription-list">
              {summary.prescriptions.map(
                (prescription) => (
                  <PrescriptionCard
                    key={
                      prescription.id
                    }
                    prescription={
                      prescription
                    }
                    showDates={
                      summary.prescriptions
                        .length > 1
                    }
                  />
                ),
              )}
            </div>

            {summary.prescriptions.length >
              1 && (
              <p className="weekly-prescription-note">
                Your prescription changed during this
                week. Each version above is preserved
                with the days it was in effect.
              </p>
            )}
          </section>

          <section className="weekly-summary-section">
            <h2>Nutrition Report Card</h2>

            <div className="weekly-report-card-top">
              <div>
                <strong
                  className={`weekly-adherence-value ${calculations.adherenceState}`}
                >
                  {formatPercent(
                    calculations.adherence,
                  )}
                </strong>
                <span>Meal Plan Adherence</span>
              </div>

              <div>
                <strong>
                  {calculations.daysReported}
                </strong>
                <span>
                  Days Reported
                </span>
              </div>
            </div>

            <dl className="weekly-summary-list">
              {[5, 4, 3, 2, 1].map(
                (score) => {
                  const count =
                    calculations
                      .mealBreakdown[score]

                  if (!count) {
                    return null
                  }

                  return (
                    <div key={score}>
                      <dt>
                        {MEAL_PLAN_LABELS[
                          score
                        ]}
                      </dt>
                      <dd>
                        {count}{' '}
                        {count === 1
                          ? 'day'
                          : 'days'}
                      </dd>
                    </div>
                  )
                },
              )}

              {calculations.cheatMealDays >
                0 && (
                <div>
                  <dt>
                    Planned cheat meal
                  </dt>
                  <dd>
                    {
                      calculations
                        .cheatMealDays
                    }{' '}
                    {calculations
                      .cheatMealDays === 1
                      ? 'day'
                      : 'days'}
                  </dd>
                </div>
              )}
            </dl>

            <p className="weekly-data-note">
              Adherence reflects how closely you
              reported following the prescribed meal
              plan. Juntos does not invent or estimate
              calories that were not tracked.
            </p>
          </section>

          <section className="weekly-summary-section">
            <h2>Activity</h2>

            <div className="weekly-activity-summary">
              <article>
                <strong>
                  {
                    calculations
                      .workoutsCompleted
                  }
                  {calculations
                    .stableWorkoutTarget !==
                  null
                    ? ` / ${
                        calculations
                          .stableWorkoutTarget
                      }`
                    : ''}
                </strong>

                <span>
                  Workouts Completed
                </span>

                {(calculations
                  .workoutsPartial >
                  0 ||
                  calculations
                    .workoutsMissed >
                    0) && (
                  <small>
                    {
                      calculations
                        .workoutsPartial
                    }{' '}
                    partial ·{' '}
                    {
                      calculations
                        .workoutsMissed
                    }{' '}
                    missed
                  </small>
                )}
              </article>

              <article>
                <strong>
                  {
                    calculations
                      .cardioMinutes
                  }
                  {calculations
                    .stableCardioTarget !==
                  null
                    ? ` / ${
                        calculations
                          .stableCardioTarget
                      }`
                    : ''}
                </strong>

                <span>
                  Cardio Minutes
                </span>
              </article>
            </div>

            {(calculations
              .stableWorkoutTarget ===
              null ||
              calculations
                .stableCardioTarget ===
                null) &&
              summary.prescriptions.length >
                1 && (
              <p className="weekly-data-note">
                An activity target changed during this
                week. See the saved prescription
                versions above instead of forcing one
                misleading weekly target.
              </p>
            )}

            {(calculations
              .waterTrackedDays >
              0 ||
              calculations
                .alcoholTrackedDays >
                0) && (
              <dl className="weekly-summary-list">
                {calculations
                  .waterTrackedDays >
                  0 && (
                  <div>
                    <dt>Water Goal Hit</dt>
                    <dd>
                      {
                        calculations
                          .waterGoalDays
                      }{' '}
                      of{' '}
                      {
                        calculations
                          .waterTrackedDays
                      }{' '}
                      days
                      {calculations
                        .stableWaterTarget !==
                      null
                        ? ` · ${
                            calculations
                              .stableWaterTarget
                          } oz goal`
                        : ''}
                    </dd>
                  </div>
                )}

                {calculations
                  .alcoholTrackedDays >
                  0 && (
                  <div>
                    <dt>Alcohol</dt>
                    <dd>
                      {
                        calculations
                          .alcoholDays
                      }{' '}
                      {calculations
                        .alcoholDays === 1
                        ? 'day'
                        : 'days'}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          <section className="weekly-summary-section">
            <h2>Recovery & Context</h2>

            <dl className="weekly-summary-list">
              <div>
                <dt>Sleep</dt>
                <dd>
                  {displayRecovery(
                    'sleep_quality',
                    summary.week
                      .sleep_quality,
                  )}
                </dd>
              </div>

              <div>
                <dt>Energy</dt>
                <dd>
                  {displayRecovery(
                    'energy_level',
                    summary.week
                      .energy_level,
                  )}
                </dd>
              </div>

              <div>
                <dt>Training Recovery</dt>
                <dd>
                  {displayRecovery(
                    'recovery_score',
                    summary.week
                      .recovery_score,
                  )}
                </dd>
              </div>

              <div>
                <dt>Stress</dt>
                <dd>
                  {displayRecovery(
                    'stress_level',
                    summary.week
                      .stress_level,
                  )}
                </dd>
              </div>
            </dl>

            {summary.week
              .menstrual_cycle_context && (
              <div className="weekly-context-note">
                <strong>
                  Menstrual Cycle Context
                </strong>
                <p>
                  {
                    summary.week
                      .menstrual_cycle_context
                  }
                </p>
              </div>
            )}

            {summary.week
              .weekly_reflection && (
              <div className="weekly-context-note">
                <strong>
                  Weekly Reflection
                </strong>
                <p>
                  {
                    summary.week
                      .weekly_reflection
                  }
                </p>
              </div>
            )}
          </section>

          {summary.preview ? (
            <section className="weekly-coach-placeholder">
              <h2>Coach Review</h2>

              <p>
                Brain Lite generates from a completed
                Weekly Check-In. DEV Summary Preview
                stays read-only and does not create a
                saved coaching review.
              </p>
            </section>
          ) : coachReview ? (
            <CoachReviewCard
              review={coachReview}
            />
          ) : coachLoading ? (
            <section
              className="weekly-coach-loading"
              aria-live="polite"
            >
              <h2>Coach Review</h2>
              <p>
                Juntos Coach is reviewing your week…
              </p>
            </section>
          ) : coachError ? (
            <section className="weekly-coach-error">
              <h2>Coach Review</h2>
              <p>{coachError}</p>
              <p>
                Your Weekly Check-In and Weekly Summary
                are already saved.
              </p>
              <button
                type="button"
                onClick={retryCoachReview}
              >
                Try Coach Review Again
              </button>
            </section>
          ) : (
            <section className="weekly-coach-loading">
              <h2>Coach Review</h2>
              <p>
                Your coaching review is getting ready.
              </p>
            </section>
          )}
        </>
      )}
      </main>

      <nav
        className="bottom-navigation"
        aria-label="Main navigation"
      >
        <button
          type="button"
          className="is-active"
          aria-current="page"
          onClick={onOpenToday}
        >
          Today
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
        >
          Progress
        </button>

        <button
          type="button"
          onClick={onOpenPlan}
        >
          Plan
        </button>

        <button
          type="button"
          disabled
        >
          Coach
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </nav>
    </>
  )
}
