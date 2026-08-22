import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  loadCheckInHistory,
  markDailyDataUnavailable,
} from '../services/checkInHistoryService'
import {
  formatDate,
} from '../utils/formatters'
import {
  addDays,
} from '../utils/dates'
import {
  fromCanonicalMeasurement,
  getMeasurementUnit,
  normalizeUnitSystem,
} from '../utils/measurementUnits'
import '../styles/checkInHistory.css'

const MEAL_PLAN_LABELS = {
  1: 'Did not follow the plan',
  2: 'Significantly off plan',
  3: 'Several deviations',
  4: 'One small deviation',
  5: 'Followed exactly',
}

const HUNGER_LABELS = {
  1: 'Barely hungry',
  2: 'Comfortable',
  3: 'Noticeably hungry',
  4: 'Very hungry / distracting',
  5: 'Extremely hungry / hard to ignore',
}

const WORKOUT_LABELS = {
  completed: 'Completed',
  partial: 'Partially completed',
  missed: 'Did not complete',
  rest_day: 'Rest day / no workout scheduled',
}

const WEIGHT_STATUS_LABELS = {
  traveling: 'No weight — traveling',
  no_scale: 'No weight — no scale available',
  scale_issue: 'No weight — scale problem',
  skipped: 'Skipped weighing',
}

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

function yesNo(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return '—'
}

function formatTimestamp(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function HistoryAnswer({ label, value }) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  return (
    <div className="history-answer">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function DailyAnswers({ row, unitSystem }) {
  const weightValue =
    fromCanonicalMeasurement(
      'starting_weight_lbs',
      row.morning_weight,
      unitSystem,
    )

  const weight =
    row.weight_status === 'recorded' && weightValue
      ? `${weightValue} ${getMeasurementUnit(
          'starting_weight_lbs',
          unitSystem,
        )}`
      : WEIGHT_STATUS_LABELS[
          row.weight_status
        ] || 'No weight recorded'

  const reviewDate =
    row.review_date ||
    addDays(row.checkin_date, -1)

  const notes = [
    row.additional_notes,
    row.questions_for_coach,
  ]
    .filter(Boolean)
    .join('\n\n')

  return (
    <div className="history-answer-sections">
      <section>
        <h3>
          Morning · {formatDate(row.checkin_date)}
        </h3>
        <dl>
          <HistoryAnswer
            label="Weight"
            value={weight}
          />
        </dl>
      </section>

      <section>
        <h3>
          About {formatDate(reviewDate)}
        </h3>
        <dl>
          <HistoryAnswer
            label="Meal plan"
            value={
              MEAL_PLAN_LABELS[
                Number(row.meal_plan_score)
              ] || '—'
            }
          />

          <HistoryAnswer
            label="What was different"
            value={
              row.meal_plan_deviation_details
            }
          />

          {row.planned_cheat_meal_status && (
            <HistoryAnswer
              label="Planned cheat meal"
              value={
                row.planned_cheat_meal_status ===
                'eaten'
                  ? 'Yes'
                  : 'No'
              }
            />
          )}

          <HistoryAnswer
            label="Hunger"
            value={
              HUNGER_LABELS[
                Number(row.hunger_score)
              ] || '—'
            }
          />

          <HistoryAnswer
            label="Workout"
            value={
              WORKOUT_LABELS[
                row.workout_status
              ] || '—'
            }
          />

          <HistoryAnswer
            label="Workout reason"
            value={
              row.workout_incomplete_reason
            }
          />

          {row.training_problem !== null &&
            row.training_problem !==
              undefined && (
              <HistoryAnswer
                label="Training problem"
                value={yesNo(
                  row.training_problem,
                )}
              />
            )}

          <HistoryAnswer
            label="Training details"
            value={
              row.training_problem_details
            }
          />

          <HistoryAnswer
            label="Cardio"
            value={`${Number(
              row.cardio_minutes ?? 0,
            )} minutes`}
          />

          {row.water_goal_met !== null &&
            row.water_goal_met !==
              undefined && (
              <HistoryAnswer
                label="Water goal"
                value={yesNo(
                  row.water_goal_met,
                )}
              />
            )}

          {row.alcohol_consumed !== null &&
            row.alcohol_consumed !==
              undefined && (
              <HistoryAnswer
                label="Alcohol"
                value={yesNo(
                  row.alcohol_consumed,
                )}
              />
            )}

          <HistoryAnswer
            label="Alcohol details"
            value={row.alcohol_details}
          />

          <HistoryAnswer
            label="Coach notes"
            value={notes}
          />
        </dl>
      </section>

      <p className="history-entered-at">
        Entered {formatTimestamp(row.created_at)}
        {row.updated_at &&
        row.updated_at !== row.created_at
          ? ` · Updated ${formatTimestamp(
              row.updated_at,
            )}`
          : ''}
      </p>
    </div>
  )
}

function displayRecovery(field, value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return ''
  }

  const label =
    RECOVERY_LABELS[field]?.[value]

  return label
    ? `${label} (${value}/5)`
    : `${value}/5`
}

function displayMeasurement(
  field,
  value,
  unitSystem,
) {
  const displayed =
    fromCanonicalMeasurement(
      field,
      value,
      unitSystem,
    )

  if (!displayed) {
    return ''
  }

  return `${displayed} ${getMeasurementUnit(
    field,
    unitSystem,
  )}`
}

function displayBodyFat(row) {
  if (
    row.body_fat_percent === null ||
    row.body_fat_percent === undefined
  ) {
    return ''
  }

  const percent = Number(
    row.body_fat_percent,
  )

  const value = Number.isFinite(percent)
    ? `${percent.toFixed(1)}%`
    : `${row.body_fat_percent}%`

  if (row.body_fat_source === 'scale') {
    return `${value} · Scale`
  }

  if (
    row.body_fat_source ===
    'juntos_estimate'
  ) {
    return row.body_fat_method
      ? `${value} · Juntos estimate (${row.body_fat_method})`
      : `${value} · Juntos estimate`
  }

  return value
}

function WeeklyAnswers({
  row,
  dailyRow,
  unitSystem,
}) {
  const measurementSide =
    row.measurement_side === 'left'
      ? 'Left'
      : row.measurement_side === 'right'
        ? 'Right'
        : ''

  return (
    <div className="history-answer-sections">
      {dailyRow && (
        <div className="history-weekly-daily-answers">
          <h3>Daily Answers Included in Weekly</h3>
          <DailyAnswers
            row={dailyRow}
            unitSystem={unitSystem}
          />
        </div>
      )}

      <section>
        <h3>Weekly Recovery & Context</h3>
        <dl>
          <HistoryAnswer
            label="Sleep"
            value={displayRecovery(
              'sleep_quality',
              row.sleep_quality,
            )}
          />
          <HistoryAnswer
            label="Energy"
            value={displayRecovery(
              'energy_level',
              row.energy_level,
            )}
          />
          <HistoryAnswer
            label="Training recovery"
            value={displayRecovery(
              'recovery_score',
              row.recovery_score,
            )}
          />
          <HistoryAnswer
            label="Stress manageability"
            value={displayRecovery(
              'stress_level',
              row.stress_level,
            )}
          />
          <HistoryAnswer
            label="Menstrual-cycle context"
            value={
              row.menstrual_cycle_context
            }
          />
          <HistoryAnswer
            label="Weekly reflection"
            value={row.weekly_reflection}
          />
          <HistoryAnswer
            label="Questions for coach"
            value={row.questions_for_coach}
          />
        </dl>
      </section>

      <section>
        <h3>Weekly Measurements</h3>
        <dl>
          <HistoryAnswer
            label="Body fat"
            value={displayBodyFat(row)}
          />
          <HistoryAnswer
            label="Neck"
            value={displayMeasurement(
              'neck_inches',
              row.neck,
              unitSystem,
            )}
          />
          <HistoryAnswer
            label="Chest"
            value={displayMeasurement(
              'chest_inches',
              row.chest,
              unitSystem,
            )}
          />
          <HistoryAnswer
            label="Waist"
            value={displayMeasurement(
              'waist_inches',
              row.waist,
              unitSystem,
            )}
          />
          <HistoryAnswer
            label="Hips"
            value={displayMeasurement(
              'hips_inches',
              row.hips,
              unitSystem,
            )}
          />
          <HistoryAnswer
            label={
              measurementSide
                ? `${measurementSide} upper arm`
                : 'Upper arm'
            }
            value={displayMeasurement(
              'upper_arm_inches',
              row.measurement_side === 'left'
                ? row.left_arm
                : row.right_arm ??
                  row.left_arm,
              unitSystem,
            )}
          />
          <HistoryAnswer
            label={
              measurementSide
                ? `${measurementSide} thigh`
                : 'Thigh'
            }
            value={displayMeasurement(
              'thigh_inches',
              row.measurement_side === 'left'
                ? row.left_thigh
                : row.right_thigh ??
                  row.left_thigh,
              unitSystem,
            )}
          />
          <HistoryAnswer
            label={
              measurementSide
                ? `${measurementSide} calf`
                : 'Calf'
            }
            value={displayMeasurement(
              'calf_inches',
              row.measurement_side === 'left'
                ? row.left_calf
                : row.right_calf ??
                  row.left_calf,
              unitSystem,
            )}
          />
        </dl>
      </section>

      <p className="history-entered-at">
        Submitted {formatTimestamp(
          row.submitted_at,
        )}
      </p>
    </div>
  )
}

function getStatusText(item) {
  if (item.type === 'weekly') {
    return {
      completed: 'Completed ✓',
      submitted: 'Submitted ✓',
      draft: 'In progress',
      due: 'Due today',
      overdue: 'Overdue',
      upcoming: 'Scheduled',
      not_recorded: 'Missed',
    }[item.status] || item.status
  }

  return {
    completed: 'Entered ✓',
    unavailable: 'No data',
    missing: 'Missing',
    today: 'Today',
    upcoming: 'Upcoming',
  }[item.status] || item.status
}

function getStatusClass(item) {
  if (
    item.status === 'completed' ||
    item.status === 'submitted'
  ) {
    return 'is-complete'
  }

  if (
    item.status === 'missing' ||
    item.status === 'overdue' ||
    item.status === 'not_recorded'
  ) {
    return 'is-missing'
  }

  if (item.status === 'unavailable') {
    return 'is-neutral'
  }

  if (
    item.status === 'today' ||
    item.status === 'due' ||
    item.status === 'draft'
  ) {
    return 'is-current'
  }

  return 'is-upcoming'
}

function HistoryItem({
  item,
  userId,
  plan,
  onCompleteDay,
  onOpenWeeklySummary,
  onResolved,
  unitSystem,
}) {
  const [confirmUnavailable, setConfirmUnavailable] =
    useState(false)
  const [resolving, setResolving] =
    useState(false)
  const [resolutionError, setResolutionError] =
    useState('')

  async function handleUnavailable() {
    setResolving(true)
    setResolutionError('')

    try {
      await markDailyDataUnavailable({
        userId,
        plan,
        checkinDate: item.date,
      })
      await onResolved?.()
    } catch (error) {
      setResolutionError(
        error?.message ||
          'This day could not be marked unavailable.',
      )
    } finally {
      setResolving(false)
      setConfirmUnavailable(false)
    }
  }

  const title =
    item.type === 'weekly'
      ? 'Weekly Check-In'
      : 'Daily Check-In'

  return (
    <article className="history-item">
      <div className="history-item-heading">
        <div>
          <strong>{formatDate(item.date)}</strong>
          <span>{title}</span>
        </div>

        <span
          className={`history-status ${getStatusClass(
            item,
          )}`}
        >
          {getStatusText(item)}
        </span>
      </div>

      {item.legacyWeeklyDate && (
        <p className="history-legacy-note">
          A Daily Check-In was saved on this scheduled
          Weekly date before a Weekly record existed.
        </p>
      )}

      {item.status === 'unavailable' && (
        <p className="history-unavailable-note">
          You marked this day as “I don’t have this data.”
        </p>
      )}

      {item.type === 'daily' &&
        item.status === 'completed' && (
          <details className="history-answer-details">
            <summary>View Answers</summary>
            <DailyAnswers
              row={item.row}
              unitSystem={unitSystem}
            />
          </details>
        )}

      {item.type === 'weekly' &&
        ['completed', 'submitted'].includes(
          item.status,
        ) && (
          <details className="history-answer-details">
            <summary>View Check-In Answers</summary>
            <WeeklyAnswers
              row={item.row}
              dailyRow={item.dailyRow}
              unitSystem={unitSystem}
            />
          </details>
        )}

      {item.type === 'weekly' &&
        ['completed', 'submitted'].includes(
          item.status,
        ) && (
          <button
            type="button"
            className="text-button history-open-summary"
            onClick={onOpenWeeklySummary}
          >
            Open Weekly Summaries
          </button>
        )}

      {item.type === 'daily' &&
        item.status === 'missing' &&
        item.canComplete && (
          <div className="history-missing-actions">
            <button
              type="button"
              onClick={() =>
                onCompleteDay(item.date)
              }
            >
              Complete This Day
            </button>

            {!confirmUnavailable ? (
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setConfirmUnavailable(true)
                }
              >
                I Don’t Have This Data
              </button>
            ) : (
              <div className="history-unavailable-confirm">
                <p>
                  Record this day as unavailable instead of
                  guessing?
                </p>
                <div>
                  <button
                    type="button"
                    className="text-button"
                    disabled={resolving}
                    onClick={() =>
                      setConfirmUnavailable(false)
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={handleUnavailable}
                  >
                    {resolving
                      ? 'Saving...'
                      : 'Confirm No Data'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      {resolutionError && (
        <p role="alert">{resolutionError}</p>
      )}
    </article>
  )
}

export function CheckInHistoryPage({
  userId,
  plan,
  profile,
  onCompleteDay,
  onOpenWeeklySummary,
  onOpenToday,
  onOpenPlan,
  onOpenSettings,
}) {
  const [history, setHistory] = useState({
    weeks: [],
    selectedWeekNumber: null,
  })
  const [selectedWeek, setSelectedWeek] =
    useState(null)
  const [loading, setLoading] =
    useState(true)
  const [error, setError] =
    useState('')

  const unitSystem =
    normalizeUnitSystem(
      profile?.unit_system,
    )

  async function load() {
    if (!plan?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const nextHistory =
        await loadCheckInHistory(plan)

      setHistory(nextHistory)
      setSelectedWeek((current) => {
        if (
          current &&
          nextHistory.weeks.some(
            (week) =>
              week.weekNumber === current,
          )
        ) {
          return current
        }

        return nextHistory.selectedWeekNumber
      })
    } catch (loadError) {
      setError(
        loadError?.message ||
          'Your Check-In History could not be loaded.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Reload only when the active plan changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id])

  const selected = useMemo(
    () =>
      history.weeks.find(
        (week) =>
          week.weekNumber ===
          Number(selectedWeek),
      ) ?? null,
    [history.weeks, selectedWeek],
  )

  return (
    <>
      <main className="container checkin-history-page">
        <button
          type="button"
          className="text-button"
          onClick={onOpenToday}
        >
          ← Back to Today
        </button>

        <header className="checkin-history-header">
          <h1>Check-In History</h1>
          <p>
            See what you entered, what’s missing, and
            which program days had no data. Past answers
            are read-only.
          </p>
        </header>

        {!plan && (
          <p role="alert">
            An active coaching plan is required.
          </p>
        )}

        {error && <p role="alert">{error}</p>}

        {loading && <p>Loading your check-ins...</p>}

        {!loading &&
          plan &&
          history.weeks.length === 0 && (
            <section className="history-empty">
              <h2>No check-ins yet</h2>
              <p>
                Your history will fill in as your plan
                gets underway.
              </p>
            </section>
          )}

        {history.weeks.length > 0 && (
          <>
            <label
              className="history-week-label"
              htmlFor="history-week"
            >
              Program week
            </label>

            <select
              id="history-week"
              className="history-week-selector"
              value={selectedWeek ?? ''}
              onChange={(event) =>
                setSelectedWeek(
                  Number(event.target.value),
                )
              }
            >
              {[...history.weeks]
                .reverse()
                .map((week) => (
                  <option
                    key={week.weekNumber}
                    value={week.weekNumber}
                  >
                    Week {week.weekNumber} ·{' '}
                    {formatDate(week.weekStart)} –{' '}
                    {formatDate(week.weekEnd)}
                  </option>
                ))}
            </select>

            {selected && (
              <section className="history-week-card">
                <div className="history-week-heading">
                  <div>
                    <h2>
                      Week {selected.weekNumber}
                    </h2>
                    <p>
                      {formatDate(selected.weekStart)} –{' '}
                      {formatDate(selected.weekEnd)}
                    </p>
                  </div>

                  <span>
                    Weekly due{' '}
                    {formatDate(
                      selected.weeklyDueDate,
                    )}
                  </span>
                </div>

                <div className="history-items">
                  {selected.items.map((item) => (
                    <HistoryItem
                      key={`${item.type}-${item.date}`}
                      item={item}
                      userId={userId}
                      plan={plan}
                      onCompleteDay={onCompleteDay}
                      onOpenWeeklySummary={
                        onOpenWeeklySummary
                      }
                      onResolved={load}
                      unitSystem={unitSystem}
                    />
                  ))}
                </div>
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
          onClick={onOpenToday}
        >
          Today
        </button>

        <button
          type="button"
          className="is-active"
          aria-current="page"
        >
          Progress
        </button>

        <button
          type="button"
          onClick={onOpenPlan}
        >
          Plan
        </button>

        <button type="button" disabled>
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
