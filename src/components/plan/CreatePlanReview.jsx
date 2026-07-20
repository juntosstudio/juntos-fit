import {
  formatDate,
  formatGoal,
} from '../../utils/formatters'
import {
  BODY_FAT_SOURCE_OPTIONS,
  UNIT_SYSTEM_OPTIONS,
  WEEKDAY_OPTIONS,
} from '../../utils/createPlanFlow'

function ReviewItem({ label, value }) {
  return (
    <div className="review-item">
      <dt>{label}:</dt>
      <dd>{value}</dd>
    </div>
  )
}

function getOptionLabel(options, value) {
  return (
    options.find(
      (option) =>
        option.value === value ||
        option.value === Number(value),
    )?.label ?? 'Not set'
  )
}

// Displays the complete plan before it is created.
export function CreatePlanReview({ form }) {
  return (
    <div className="checkin-review create-plan-review">
      <section>
        <h2>Plan Schedule</h2>

        <dl>
          <ReviewItem
            label="Goal"
            value={formatGoal(form.goal)}
          />

          <ReviewItem
            label="Measurement units"
            value={getOptionLabel(
              UNIT_SYSTEM_OPTIONS,
              form.unit_system,
            )}
          />

          <ReviewItem
            label="Body fat"
            value={getOptionLabel(
              BODY_FAT_SOURCE_OPTIONS,
              form.body_fat_source,
            )}
          />

          <ReviewItem
            label="Start date"
            value={formatDate(form.start_date)}
          />

          <ReviewItem
            label="Program length"
            value={`${form.program_length_weeks} weeks`}
          />

          <ReviewItem
            label="Weekly check-in"
            value={getOptionLabel(
              WEEKDAY_OPTIONS,
              form.checkin_day,
            )}
          />

          <ReviewItem
            label="Measurements"
            value="Every week"
          />

          <ReviewItem
            label="Progress photos"
            value="Every 4 weeks"
          />
        </dl>
      </section>

      <section>
        <h2>Nutrition Targets</h2>

        <dl>
          <ReviewItem
            label="Calories"
            value={`${Number(
              form.calorie_target,
            ).toLocaleString()} kcal`}
          />

          <ReviewItem
            label="Protein"
            value={`${form.protein_grams} g`}
          />

          <ReviewItem
            label="Carbohydrates"
            value={`${form.carb_grams} g`}
          />

          <ReviewItem
            label="Fat"
            value={`${form.fat_grams} g`}
          />
        </dl>
      </section>

      <section>
        <h2>Activity Targets</h2>

        <dl>
          <ReviewItem
            label="Workouts"
            value={`${form.weekly_workout_target} per week`}
          />

          <ReviewItem
            label="Cardio"
            value={`${form.weekly_cardio_target_minutes} min/week`}
          />

          <ReviewItem
            label="Water"
            value={`${form.daily_water_goal_oz} oz/day`}
          />
        </dl>
      </section>
    </div>
  )
}
