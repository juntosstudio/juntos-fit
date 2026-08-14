import {
  DailyCheckInReview,
} from './DailyCheckInReview'
import {
  getMeasurementUnit,
} from '../../utils/measurementUnits'

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

function formatNumber(value) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return ''
  }

  const number = Number(value)

  if (!Number.isFinite(number)) {
    return String(value)
  }

  return Number(
    number.toFixed(1),
  ).toString()
}

function displayMeasurement(
  value,
  validationField,
  unitSystem,
) {
  const formatted = formatNumber(value)

  return formatted
    ? `${formatted} ${getMeasurementUnit(
        validationField,
        unitSystem,
      )}`
    : '—'
}

function displayScore(field, value) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return '—'
  }

  return (
    `${RECOVERY_LABELS[field]?.[value] ?? value} ` +
    `(${value} / 5)`
  )
}

function ReviewItem({ label, value }) {
  return (
    <div className="review-item">
      <dt>{label}:</dt>
      <dd>{value || 'None'}</dd>
    </div>
  )
}

export function WeeklyCheckInReview({
  form,
  target,
  today,
  weekNumber,
  plan,
  photos,
  settings,
  photosRequired,
  unitSystem,
  bodyFatSource,
  estimatedBodyFat,
}) {
  const sideLabel =
    (
      plan?.measurement_side ??
      plan?.side_choice
    ) === 'left'
      ? 'Left'
      : 'Right'

  let bodyFatAnswer =
    'Body fat is not tracked'

  if (bodyFatSource === 'scale') {
    bodyFatAnswer =
      form.body_fat_status === 'recorded'
        ? `${formatNumber(
            form.scale_body_fat_percent,
          )}% from scale`
        : 'No scale reading today'
  }

  if (
    bodyFatSource ===
    'juntos_estimate'
  ) {
    bodyFatAnswer = estimatedBodyFat
      ? `${estimatedBodyFat.percent.toFixed(
          1,
        )}% — Juntos Fit estimate (RFM)`
      : 'Juntos Fit estimate unavailable'
  }

  return (
    <div className="weekly-checkin-review">
      <section>
        <h2>Daily Check-In Answers</h2>

        <DailyCheckInReview
          form={form}
          target={target}
          today={today}
          settings={settings}
          showCoachNotes={false}
        />
      </section>

      {bodyFatSource !==
        'none' && (
        <section>
          <h2>Body Fat</h2>

          <dl>
            <ReviewItem
              label="Body fat"
              value={bodyFatAnswer}
            />
          </dl>
        </section>
      )}

      <section>
        <h2>Week {weekNumber} Recovery</h2>

        <dl>
          <ReviewItem
            label="Sleep"
            value={displayScore(
              'sleep_quality',
              form.sleep_quality,
            )}
          />

          <ReviewItem
            label="Energy"
            value={displayScore(
              'energy_level',
              form.energy_level,
            )}
          />

          <ReviewItem
            label="Training recovery"
            value={displayScore(
              'recovery_score',
              form.recovery_score,
            )}
          />

          <ReviewItem
            label="Stress manageability"
            value={displayScore(
              'stress_level',
              form.stress_level,
            )}
          />
        </dl>
      </section>

      <section>
        <h2>
          {photosRequired
            ? 'Full Measurements'
            : 'Weekly Measurement'}
        </h2>

        <dl>
          {photosRequired && (
            <>
              <ReviewItem
                label="Neck"
                value={displayMeasurement(
                  form.neck_inches,
                  'neck_inches',
                  unitSystem,
                )}
              />

              <ReviewItem
                label="Chest"
                value={displayMeasurement(
                  form.chest_inches,
                  'chest_inches',
                  unitSystem,
                )}
              />
            </>
          )}

          <ReviewItem
            label="Waist"
            value={displayMeasurement(
              form.waist_inches,
              'waist_inches',
              unitSystem,
            )}
          />

          {photosRequired && (
            <>
              <ReviewItem
                label="Hips"
                value={displayMeasurement(
                  form.hips_inches,
                  'hips_inches',
                  unitSystem,
                )}
              />

              <ReviewItem
                label={`${sideLabel} bicep`}
                value={displayMeasurement(
                  form.bicep_inches,
                  'upper_arm_inches',
                  unitSystem,
                )}
              />

              <ReviewItem
                label={`${sideLabel} thigh`}
                value={displayMeasurement(
                  form.thigh_inches,
                  'thigh_inches',
                  unitSystem,
                )}
              />

              <ReviewItem
                label={`${sideLabel} calf`}
                value={displayMeasurement(
                  form.calf_inches,
                  'calf_inches',
                  unitSystem,
                )}
              />
            </>
          )}
        </dl>
      </section>

      {form.menstrual_cycle_context
        ?.trim() && (
        <section>
          <h2>Menstrual Cycle Context</h2>
          <p>
            {form.menstrual_cycle_context}
          </p>
        </section>
      )}

      {photosRequired && (
        <section>
          <h2>Progress Photos</h2>

          <dl>
            <ReviewItem
              label="Front"
              value={
                photos.front?.name ??
                (photos.front
                  ? 'Saved'
                  : 'Not selected')
              }
            />

            <ReviewItem
              label={`${sideLabel} side`}
              value={
                photos.side?.name ??
                (photos.side
                  ? 'Saved'
                  : 'Not selected')
              }
            />

            <ReviewItem
              label="Back"
              value={
                photos.back?.name ??
                (photos.back
                  ? 'Saved'
                  : 'Not selected')
              }
            />
          </dl>
        </section>
      )}

      <section>
        <h2>
          Weekly Reflection & Coach Message
        </h2>

        <p>
          {form.weekly_reflection?.trim() ||
            'None'}
        </p>
      </section>
    </div>
  )
}
