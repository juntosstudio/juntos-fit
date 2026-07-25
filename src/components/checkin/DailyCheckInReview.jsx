import {
  WizardReview,
  WizardReviewItem,
  WizardReviewSection,
} from '../wizard'
import { addDays } from '../../utils/dates'
import {
  formatDateWithOrdinal,
} from '../../utils/formatters'

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
  eaten:
    'Yes — had the planned cheat meal',
  not_eaten:
    'No — did not have the planned cheat meal',
  not_planned:
    'No cheat meal was planned',
}

const WORKOUT_LABELS = {
  completed: 'Completed',
  partial: 'Partially completed',
  missed: 'Did not complete',
  rest_day:
    'Rest day / no workout scheduled',
}

const WEIGHT_STATUS_LABELS = {
  traveling: 'No weight — traveling',
  no_scale:
    'No weight — no scale available',
  scale_issue:
    'No weight — scale problem',
  skipped:
    'Skipped weighing this morning',
}

function yesNo(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'

  return 'Not answered'
}

// Shows the same meaningful review answers using
// the shared wizard review presentation.
export function DailyCheckInReview({
  form,
  target,
  today,
}) {
  const mealPlanScore = Number(
    form.meal_plan_score,
  )

  const waterGoal =
    target?.daily_water_goal_oz ?? 0

  const workoutWasAttempted = [
    'completed',
    'partial',
  ].includes(form.workout_status)

  const weightAnswer =
    form.weight_status === 'recorded'
      ? `${form.morning_weight} lbs`
      : WEIGHT_STATUS_LABELS[
          form.weight_status
        ]

  const waterAnswer =
    form.water_goal_met === true
      ? `${waterGoal} / ${waterGoal} oz — Goal met`
      : `Goal not met — ${waterGoal} oz target`

  const reviewDate = addDays(today, -1)

  return (
    <WizardReview>
      <WizardReviewSection
        title={`This Morning, ${formatDateWithOrdinal(
          today,
        )}`}
      >
        <WizardReviewItem
          label="Morning weight"
          value={weightAnswer}
        />
      </WizardReviewSection>

      <WizardReviewSection
        title={`Yesterday, ${formatDateWithOrdinal(
          reviewDate,
        )}`}
      >
        <WizardReviewItem
          label="Meal-plan adherence"
          value={
            MEAL_PLAN_LABELS[
              mealPlanScore
            ]
          }
        />

        {mealPlanScore >= 1 &&
          mealPlanScore <= 4 && (
            <WizardReviewItem
              label="What was different"
              value={
                form
                  .meal_plan_deviation_details
              }
            />
          )}

        {mealPlanScore >= 1 &&
          mealPlanScore <= 4 && (
            <WizardReviewItem
              label="Planned cheat meal"
              value={
                CHEAT_MEAL_LABELS[
                  form
                    .planned_cheat_meal_status
                ]
              }
            />
          )}

        <WizardReviewItem
          label="Overall hunger"
          value={
            HUNGER_LABELS[
              form.hunger_score
            ]
          }
        />

        <WizardReviewItem
          label="Water"
          value={waterAnswer}
        />

        <WizardReviewItem
          label="Workout"
          value={
            WORKOUT_LABELS[
              form.workout_status
            ]
          }
        />

        {form.workout_status ===
          'missed' && (
          <WizardReviewItem
            label="What prevented the workout"
            value={
              form
                .workout_incomplete_reason
            }
          />
        )}

        {workoutWasAttempted && (
          <WizardReviewItem
            label="Pain, difficulty, or problems"
            value={yesNo(
              form.training_problem,
            )}
          />
        )}

        {workoutWasAttempted &&
          form.training_problem === true && (
            <WizardReviewItem
              label="Training problem details"
              value={
                form
                  .training_problem_details
              }
            />
          )}

        <WizardReviewItem
          label="Cardio"
          value={`${form.cardio_minutes} minutes`}
        />

        <WizardReviewItem
          label="Alcohol"
          value={yesNo(
            form.alcohol_consumed,
          )}
        />

        {form.alcohol_consumed ===
          true && (
          <WizardReviewItem
            label="What and how much"
            value={form.alcohol_details}
          />
        )}
      </WizardReviewSection>

      <WizardReviewSection title="Coach Notes">
        <WizardReviewItem
          label="Anything else to share"
          value={form.additional_notes}
        />

        <WizardReviewItem
          label="Questions for coach"
          value={
            form.questions_for_coach
          }
        />
      </WizardReviewSection>
    </WizardReview>
  )
}
