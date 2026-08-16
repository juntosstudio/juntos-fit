import {
  useEffect,
  useState,
} from 'react'
import {
  formatGoal,
} from '../../utils/formatters'

function formatWeight(value) {
  return Number.isFinite(Number(value))
    ? `${Number(value).toFixed(1)} lbs`
    : '—'
}

function getPlanProgressRows(
  plan,
  currentWeekNumber,
  weeks,
) {
  const programLength = Number(
    plan?.program_length_weeks,
  )

  if (
    !Number.isInteger(programLength) ||
    programLength < 1
  ) {
    return []
  }

  const weekDataByNumber = new Map(
    (weeks ?? []).map(
      (week) => [
        Number(week.weekNumber),
        week,
      ],
    ),
  )

  return Array.from(
    {
      length: programLength,
    },
    (_, index) => {
      const weekNumber = index + 1
      const weekData =
        weekDataByNumber.get(
          weekNumber,
        )

      if (
        weekNumber ===
        currentWeekNumber
      ) {
        return {
          ...weekData,
          weekNumber,
          status: 'current',
        }
      }

      if (
        currentWeekNumber &&
        weekNumber <
          currentWeekNumber
      ) {
        if (
          weekData?.weeklyStatus ===
          'completed'
        ) {
          return {
            ...weekData,
            weekNumber,
            status: 'completed',
          }
        }

        if (
          weekData?.weeklyStatus ===
          'draft'
        ) {
          return {
            ...weekData,
            weekNumber,
            status: 'needs-review',
          }
        }

        return {
          ...weekData,
          weekNumber,
          status: 'no-weekly',
        }
      }

      return {
        weekNumber,
        status: 'upcoming',
      }
    },
  )
}

export function PlanProgress({
  plan,
  currentWeekNumber,
  weeks,
  onOpenCurrentWeek,
  onOpenWeeklyReview,
  initialShowAll = false,
}) {
  const [
    showAllWeeks,
    setShowAllWeeks,
  ] = useState(initialShowAll)

  // A dedicated Progress screen opens expanded, while the
  // Dashboard opens compact. Keep the component in sync if
  // it is reused with a different display mode.
  useEffect(() => {
    setShowAllWeeks(
      initialShowAll,
    )
  }, [initialShowAll, plan?.id])

  const rows =
    getPlanProgressRows(
      plan,
      currentWeekNumber,
      weeks,
    )

  const programLength = Number(
    plan?.program_length_weeks,
  )

  const defaultLastVisibleWeek =
    currentWeekNumber
      ? Math.min(
          programLength,
          currentWeekNumber + 2,
        )
      : Math.min(
          programLength,
          2,
        )

  const visibleRows =
    showAllWeeks
      ? rows
      : rows.filter(
          (row) =>
            row.weekNumber <=
            defaultLastVisibleWeek,
        )

  const hasHiddenWeeks =
    visibleRows.length < rows.length

  function renderRowContent(
    row,
  ) {
    if (
      row.status ===
      'completed'
    ) {
      return (
        <>
          <div className="plan-progress-row-topline">
            <strong>
              Week {row.weekNumber}
            </strong>

            <span className="plan-progress-status is-complete">
              Completed ✓
            </span>
          </div>

          <div className="plan-progress-row-details">
            {Number.isFinite(
              Number(
                row.consistencyPercent,
              ),
            ) && (
              <span>
                Consistency{' '}
                <strong>
                  {Math.round(
                    row.consistencyPercent,
                  )}
                  %
                </strong>
              </span>
            )}

            {Number.isFinite(
              Number(
                row.averageWeight,
              ),
            ) && (
              <span>
                Avg Weight{' '}
                <strong>
                  {formatWeight(
                    row.averageWeight,
                  )}
                </strong>
              </span>
            )}
          </div>
        </>
      )
    }

    if (
      row.status ===
      'current'
    ) {
      return (
        <>
          <div className="plan-progress-row-topline">
            <strong>
              Week {row.weekNumber}
            </strong>

            <span className="plan-progress-status is-current">
              Current
            </span>
          </div>

          <span className="plan-progress-subtext">
            In progress
          </span>
        </>
      )
    }

    if (
      row.status ===
      'needs-review'
    ) {
      return (
        <>
          <div className="plan-progress-row-topline">
            <strong>
              Week {row.weekNumber}
            </strong>

            <span className="plan-progress-status is-needs-review">
              Needs Review
            </span>
          </div>

          <span className="plan-progress-subtext">
            Weekly Check-In started but not finalized
          </span>
        </>
      )
    }

    if (
      row.status ===
      'no-weekly'
    ) {
      const hasDailyData =
        Number(row.dailyCheckInCount) > 0

      return (
        <>
          <div className="plan-progress-row-topline">
            <strong>
              Week {row.weekNumber}
            </strong>

            <span className="plan-progress-status is-no-weekly">
              No Weekly Check-In
            </span>
          </div>

          {hasDailyData ? (
            <div className="plan-progress-row-details">
              <span>
                Daily Check-Ins{' '}
                <strong>
                  {Number(row.dailyCheckInCount)}
                </strong>
              </span>

              {Number.isFinite(
                Number(
                  row.averageWeight,
                ),
              ) && (
                <span>
                  Avg Weight{' '}
                  <strong>
                    {formatWeight(
                      row.averageWeight,
                    )}
                  </strong>
                </span>
              )}
            </div>
          ) : (
            <span className="plan-progress-subtext">
              No check-in data recorded
            </span>
          )}
        </>
      )
    }

    return (
      <div className="plan-progress-row-topline">
        <strong>
          Week {row.weekNumber}
        </strong>

        <span className="plan-progress-status is-upcoming">
          Upcoming
        </span>
      </div>
    )
  }

  return (
    <section
      className="plan-progress-card"
      aria-labelledby="plan-progress-heading"
    >
      <header className="plan-progress-header">
        <h2 id="plan-progress-heading">
          Plan Progress
        </h2>

        <p>
          {formatGoal(plan.goal)}
          {currentWeekNumber
            ? ` · Week ${currentWeekNumber} of ${plan.program_length_weeks}`
            : ` · ${plan.program_length_weeks}-Week Plan`}
        </p>
      </header>

      <div className="plan-progress-list">
        {visibleRows.map(
          (row) => {
            if (
              row.status ===
              'completed'
            ) {
              return (
                <button
                  type="button"
                  className="plan-progress-row is-clickable is-completed"
                  key={
                    row.weekNumber
                  }
                  onClick={() =>
                    onOpenWeeklyReview(
                      row.weekNumber,
                    )
                  }
                  aria-label={`Open Week ${row.weekNumber} Weekly Review`}
                >
                  <span className="plan-progress-row-content">
                    {renderRowContent(
                      row,
                    )}
                  </span>

                  <span
                    className="plan-progress-chevron"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              )
            }

            if (
              row.status ===
              'current'
            ) {
              return (
                <button
                  type="button"
                  className="plan-progress-row is-clickable is-current"
                  key={
                    row.weekNumber
                  }
                  onClick={
                    onOpenCurrentWeek
                  }
                  aria-label={`Open current Week ${row.weekNumber} Daily Check-Ins`}
                >
                  <span className="plan-progress-row-content">
                    {renderRowContent(
                      row,
                    )}
                  </span>

                  <span
                    className="plan-progress-chevron"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              )
            }

            return (
              <div
                className={`plan-progress-row is-${row.status}`}
                key={
                  row.weekNumber
                }
              >
                <span className="plan-progress-row-content">
                  {renderRowContent(
                    row,
                  )}
                </span>
              </div>
            )
          },
        )}
      </div>

      {(hasHiddenWeeks ||
        showAllWeeks) &&
        rows.length > 0 && (
          <button
            type="button"
            className="text-button plan-progress-toggle"
            onClick={() =>
              setShowAllWeeks(
                (current) =>
                  !current,
              )
            }
            aria-expanded={
              showAllWeeks
            }
          >
            {showAllWeeks
              ? 'Show Less'
              : '•••  Show All Weeks'}
          </button>
        )}
    </section>
  )
}
