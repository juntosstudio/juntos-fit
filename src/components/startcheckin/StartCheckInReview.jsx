import {
  formatMeasurementValue,
  getMeasurementUnit,
} from '../../utils/measurementUnits'

function ReviewItem({ label, value }) {
  return (
    <div className="review-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function getBodyFatReview(
  plan,
  form,
  estimatedBodyFat,
) {
  if (plan.body_fat_source === 'none') {
    return 'Not tracked'
  }

  if (
    plan.body_fat_source ===
    'juntos_estimate'
  ) {
    return estimatedBodyFat
      ? `${estimatedBodyFat.percent.toFixed(
          1,
        )}% — Juntos Fit estimate`
      : 'Estimate unavailable'
  }

  if (form.body_fat_unavailable) {
    return 'No scale reading today'
  }

  if (form.body_fat_percent === '') {
    return 'Not entered'
  }

  return `${Number(
    form.body_fat_percent,
  ).toFixed(1)}%`
}

// Displays the full starting baseline before completion.
export function StartCheckInReview({
  plan,
  form,
  photos,
  estimatedBodyFat,
  unitSystem,
}) {
  const side =
    form.measurement_side === 'left'
      ? 'Left'
      : 'Right'
  const circumferenceUnit =
    getMeasurementUnit(
      'waist_inches',
      unitSystem,
    )

  return (
    <div className="checkin-review start-checkin-review">
      <section>
        <h2>Starting Baseline</h2>

        <dl>
          <ReviewItem
            label="Weight"
            value={formatMeasurementValue(
              'starting_weight_lbs',
              form.starting_weight_lbs,
              unitSystem,
            )}
          />

          <ReviewItem
            label="Body fat"
            value={getBodyFatReview(
              plan,
              form,
              estimatedBodyFat,
            )}
          />

          {[
            ['Neck', 'neck_inches'],
            ['Chest', 'chest_inches'],
            ['Waist', 'waist_inches'],
            ['Hips', 'hips_inches'],
          ].map(([label, field]) => (
            <ReviewItem
              key={field}
              label={label}
              value={formatMeasurementValue(
                field,
                form[field],
                unitSystem,
              )}
            />
          ))}

          <ReviewItem
            label="Measurement side"
            value={side}
          />

          <ReviewItem
            label={`${side} upper arm`}
            value={`${Number(
              form.upper_arm_inches,
            ).toFixed(1)} ${circumferenceUnit}`}
          />

          <ReviewItem
            label={`${side} thigh`}
            value={`${Number(
              form.thigh_inches,
            ).toFixed(1)} ${circumferenceUnit}`}
          />

          <ReviewItem
            label={`${side} calf`}
            value={`${Number(
              form.calf_inches,
            ).toFixed(1)} ${circumferenceUnit}`}
          />
        </dl>
      </section>

      <section>
        <h2>Progress Photos</h2>

        <div className="start-review-photo-grid">
          {['front', 'side', 'back'].map(
            (pose) => (
              <figure key={pose}>
                {photos[pose]?.signed_url ? (
                  <img
                    src={
                      photos[pose].signed_url
                    }
                    alt={`${pose} progress preview`}
                  />
                ) : (
                  <div className="start-review-photo-missing">
                    No photo
                  </div>
                )}

                <figcaption>
                  {pose[0].toUpperCase()}
                  {pose.slice(1)}
                </figcaption>
              </figure>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
