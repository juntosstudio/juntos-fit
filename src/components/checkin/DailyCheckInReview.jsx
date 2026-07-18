const MEAL_PLAN_LABELS = {
  1: 'Did not follow the plan',
  2: 'Significantly off plan',
  3: 'Several deviations',
  4: 'One small deviation',
  5: 'Followed the plan exactly',
}

const HUNGER_LABELS = {
  1: 'Not hungry',
  2: 'Slightly hungry',
  3: 'Manageable hunger',
  4: 'Very hungry',
  5: 'Extremely hungry',
}

const CHEAT_MEAL_LABELS = {
  eaten: 'Yes — had the planned cheat meal',
  not_eaten: 'No — did not have the planned cheat meal',
  not_planned: 'No cheat meal was planned',
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
  skipped: 'Skipped weighing this morning',
}

function yesNo(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'

  return 'Not answered'
}

function ReviewItem({ label, value }) {
  return (
    <div className="review-item">
      <dt>{label}:</dt>
      <dd>{value || 'None'}</dd>
    </div>
  )
}

// Shows meaningful answers instead of raw database values.
export function DailyCheckInReview({ form, target }) {
  const mealPlanScore = Number(form.meal_plan_score)
  const waterGoal = target?.daily_water_goal_oz ?? 0

  const workoutWasAttempted = [
    'completed',
    'partial',
  ].includes(form.workout_status)

  const weightAnswer =
    form.weight_status === 'recorded'
      ? `${form.morning_weight} lbs`
      : WEIGHT_STATUS_LABELS[form.weight_status]

  const waterAnswer =
    form.water_goal_met === true
      ? `${waterGoal} / ${waterGoal} oz — Goal met`
      : `Goal not met — ${waterGoal} oz target`

  return (
    <div className="checkin-review">
      <section>
        <h2>This Morning</h2>

        <dl>
          <ReviewItem
            label="Morning weight"
            value={weightAnswer}
          />
        </dl>
      </section>

      <section>
        <h2>Yesterday</h2>

        <dl>
          <ReviewItem
            label="Meal-plan adherence"
            value={MEAL_PLAN_LABELS[mealPlanScore]}
          />

          {mealPlanScore >= 1 &&
            mealPlanScore <= 4 && (
              <ReviewItem
                label="What was different"
                value={
                  form.meal_plan_deviation_details
                }
              />
            )}

          {mealPlanScore >= 1 &&
            mealPlanScore <= 4 && (
              <ReviewItem
              label="Planned cheat meal"
              value={
                CHEAT_MEAL_LABELS[
                  form.planned_cheat_meal_status
               ]
              }
            />
          )}

          <ReviewItem
            label="Overall hunger"
            value={HUNGER_LABELS[form.hunger_score]}
          />

          <ReviewItem
            label="Water"
            value={waterAnswer}
          />

          <ReviewItem
            label="Workout"
            value={
              WORKOUT_LABELS[form.workout_status]
            }
          />

          {form.workout_status === 'missed' && (
            <ReviewItem
              label="What prevented the workout"
              value={
                form.workout_incomplete_reason
              }
            />
          )}

          {workoutWasAttempted && (
            <ReviewItem
              label="Pain, difficulty, or problems"
              value={yesNo(form.training_problem)}
            />
          )}

          {workoutWasAttempted &&
            form.training_problem === true && (
              <ReviewItem
                label="Training problem details"
                value={
                  form.training_problem_details
                }
              />
            )}

          <ReviewItem
            label="Cardio"
            value={`${form.cardio_minutes} minutes`}
          />

          <ReviewItem
            label="Alcohol"
            value={yesNo(form.alcohol_consumed)}
          />

          {form.alcohol_consumed === true && (
            <ReviewItem
              label="What and how much"
              value={form.alcohol_details}
            />
          )}
        </dl>
      </section>

      <section>
        <h2>Coach Notes</h2>

        <dl>
          <ReviewItem
            label="Anything else to share"
            value={form.additional_notes}
          />

          <ReviewItem
            label="Questions for coach"
            value={form.questions_for_coach}
          />
        </dl>
      </section>
    </div>
  )
}