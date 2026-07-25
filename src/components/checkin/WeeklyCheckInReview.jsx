import { DailyCheckInReview } from './DailyCheckInReview'

function displayNumber(
  value,
  suffix = '',
) {
  return value === '' ||
    value === null ||
    value === undefined
    ? '—'
    : `${value}${suffix}`
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
}) {
  const sideLabel =
    plan?.measurement_side === 'left'
      ? 'Left'
      : 'Right'

  let bodyFatAnswer =
    'Body fat is not tracked for this plan'

  if (
    plan?.body_fat_source === 'scale'
  ) {
    bodyFatAnswer =
      form.body_fat_status === 'recorded'
        ? `${form.scale_body_fat_percent}% from scale`
        : 'No scale reading today'
  }

  if (
    plan?.body_fat_source ===
    'juntos_estimate'
  ) {
    bodyFatAnswer =
      'Juntos Fit estimate pending calculation'
  }

  return (
    <div className="weekly-checkin-review">
      <section>
        <h2>Daily Check-In Answers</h2>

        <DailyCheckInReview
          form={form}
          target={target}
          today={today}
        />
      </section>

      <section>
        <h2>Week {weekNumber} Recovery</h2>

        <dl>
          <ReviewItem
            label="Sleep"
            value={displayNumber(
              form.sleep_quality,
              ' / 5',
            )}
          />

          <ReviewItem
            label="Energy"
            value={displayNumber(
              form.energy_level,
              ' / 5',
            )}
          />

          <ReviewItem
            label="Training recovery"
            value={displayNumber(
              form.recovery_score,
              ' / 5',
            )}
          />

          <ReviewItem
            label="Stress"
            value={displayNumber(
              form.stress_level,
              ' / 5',
            )}
          />
        </dl>
      </section>

      <section>
        <h2>Weekly Measurements</h2>

        <dl>
          <ReviewItem
            label="Neck"
            value={displayNumber(
              form.neck_inches,
              ' in',
            )}
          />

          <ReviewItem
            label="Waist"
            value={displayNumber(
              form.waist_inches,
              ' in',
            )}
          />

          <ReviewItem
            label="Hips"
            value={displayNumber(
              form.hips_inches,
              ' in',
            )}
          />

          <ReviewItem
            label={`${sideLabel} bicep`}
            value={displayNumber(
              form.bicep_inches,
              ' in',
            )}
          />

          <ReviewItem
            label={`${sideLabel} thigh`}
            value={displayNumber(
              form.thigh_inches,
              ' in',
            )}
          />

          <ReviewItem
            label={`${sideLabel} calf`}
            value={displayNumber(
              form.calf_inches,
              ' in',
            )}
          />

          <ReviewItem
            label="Body fat"
            value={bodyFatAnswer}
          />
        </dl>
      </section>

      {form.menstrual_cycle_context?.trim() && (
        <section>
          <h2>Menstrual Cycle Context</h2>
          <p>
            {form.menstrual_cycle_context}
          </p>
        </section>
      )}

      <section>
        <h2>Progress Photos</h2>

        <dl>
          <ReviewItem
            label="Front"
            value={
              photos.front?.name ??
              'Not selected in preview'
            }
          />

          <ReviewItem
            label="Side"
            value={
              photos.side?.name ??
              'Not selected in preview'
            }
          />

          <ReviewItem
            label="Back"
            value={
              photos.back?.name ??
              'Not selected in preview'
            }
          />
        </dl>
      </section>

      {form.weekly_reflection?.trim() && (
        <section>
          <h2>Weekly Reflection</h2>
          <p>{form.weekly_reflection}</p>
        </section>
      )}
    </div>
  )
}
