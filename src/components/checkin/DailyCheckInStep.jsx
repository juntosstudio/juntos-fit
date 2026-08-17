import {
  WizardChoiceGroup,
  WizardNumberField,
  WizardQuestion,
  WizardSlider,
  WizardTextarea,
} from '../wizard'
import {
  WeightQuestion,
} from './questions/WeightQuestion'
import {
  DAILY_CHECKIN_STEP_IDS as STEP,
  MEAL_PLAN_DEVIATION_TYPES as DEVIATION,
} from '../../utils/dailyCheckInFlow'
import {
  CARDIO_INTENSITY_OPTIONS,
  CARDIO_TYPE_OPTIONS,
} from '../../utils/cardio'
import '../../styles/cardio.css'

const MEAL_PLAN_LABELS = {
  1: 'Did not follow it',
  2: 'Significantly off plan',
  3: 'Several deviations',
  4: 'One small deviation',
  5: 'Followed it exactly',
}

const HUNGER_LABELS = {
  1: 'Not hungry',
  2: 'Slightly hungry',
  3: 'Manageable hunger',
  4: 'Very hungry',
  5: 'Extremely hungry',
}

const YES_NO_OPTIONS = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
]

const MEAL_PLAN_DEVIATION_OPTIONS = [
  {
    value: DEVIATION.CHEAT_ONLY,
    label:
      'I ate my planned cheat meal, and that was ' +
      'my only deviation.',
  },
  {
    value: DEVIATION.CHEAT_PLUS,
    label:
      'I ate my planned cheat meal, and I had ' +
      'other deviations too.',
  },
  {
    value: DEVIATION.NO_CHEAT,
    label:
      'My deviations did not include a planned ' +
      'cheat meal.',
  },
]

const WORKOUT_OPTIONS = [
  {
    value: 'completed',
    label: 'Yes',
  },
  {
    value: 'partial',
    label: 'Partially',
  },
  {
    value: 'missed',
    label: 'No',
  },
  {
    value: 'rest_day',
    label: 'Rest day / no workout scheduled',
  },
]

export function DailyCheckInStep({
  step,
  form,
  setField,
  target,
  cardioCompleted,
  validationByField = {},
}) {
  if (step === STEP.WEIGHT) {
    return (
      <WeightQuestion
        id="daily-morning-weight"
        title="What was your weight this morning?"
        label="Morning weight"
        value={form.morning_weight}
        status={form.weight_status}
        feedback={
          validationByField
            .morning_weight?.message
        }
        state={
          validationByField
            .morning_weight?.displayState
        }
        onValueChange={(value) =>
          setField('morning_weight', value)
        }
        onStatusChange={(value) =>
          setField('weight_status', value)
        }
      />
    )
  }

  if (step === STEP.MEAL_PLAN_SCORE) {
    return (
      <WizardQuestion title="How closely did you follow your meal plan yesterday?">
        <WizardSlider
          name="meal-plan-score"
          value={form.meal_plan_score}
          labels={MEAL_PLAN_LABELS}
          onChange={(value) => {
            setField(
              'meal_plan_score',
              value,
            )

            if (Number(value) === 5) {
              setField(
                'meal_plan_deviation_type',
                '',
              )
              setField(
                'planned_cheat_meal_status',
                '',
              )
              setField(
                'meal_plan_deviation_details',
                '',
              )
            }
          }}
        />
      </WizardQuestion>
    )
  }

  if (step === STEP.CHEAT_MEAL) {
    return (
      <WizardQuestion title="Which best describes why you didn’t follow the meal plan exactly?">
        <WizardChoiceGroup
          name="meal-plan-deviation-type"
          value={
            form.meal_plan_deviation_type ??
            ''
          }
          options={
            MEAL_PLAN_DEVIATION_OPTIONS
          }
          onChange={(value) => {
            setField(
              'meal_plan_deviation_type',
              value,
            )

            setField(
              'planned_cheat_meal_status',
              value === DEVIATION.NO_CHEAT
                ? 'not_eaten'
                : 'eaten',
            )

            if (
              value ===
              DEVIATION.CHEAT_ONLY
            ) {
              setField(
                'meal_plan_deviation_details',
                '',
              )
            }
          }}
        />
      </WizardQuestion>
    )
  }

  if (step === STEP.MEAL_PLAN_DEVIATION) {
    const cheatMealWasIncluded =
      form.meal_plan_deviation_type ===
      DEVIATION.CHEAT_PLUS

    const title = cheatMealWasIncluded
      ? 'What else was different from yesterday’s meal plan, and why?'
      : 'What was different from yesterday’s meal plan, and why?'

    return (
      <WizardQuestion title={title}>
        <WizardTextarea
          id="daily-meal-plan-deviation"
          ariaLabel={title}
          value={
            form.meal_plan_deviation_details
          }
          onChange={(value) =>
            setField(
              'meal_plan_deviation_details',
              value,
            )
          }
          placeholder={
            cheatMealWasIncluded
              ? 'Include only the other deviations besides your planned cheat meal.'
              : 'Include anything you added, skipped, substituted, or ate in a different amount.'
          }
        />
      </WizardQuestion>
    )
  }

  if (step === STEP.HUNGER) {
    return (
      <WizardQuestion title="How hungry were you overall yesterday?">
        <WizardSlider
          name="hunger-score"
          value={form.hunger_score}
          labels={HUNGER_LABELS}
          onChange={(value) =>
            setField('hunger_score', value)
          }
          reversed
        />
      </WizardQuestion>
    )
  }

  if (step === STEP.WORKOUT_STATUS) {
    return (
      <WizardQuestion title="Did you complete your scheduled workout yesterday?">
        <WizardChoiceGroup
          name="workout-status"
          value={form.workout_status}
          options={WORKOUT_OPTIONS}
          onChange={(value) =>
            setField(
              'workout_status',
              value,
            )
          }
        />
      </WizardQuestion>
    )
  }

  if (
    step ===
    STEP.WORKOUT_INCOMPLETE_REASON
  ) {
    return (
      <WizardQuestion title="What prevented you from completing yesterday’s workout?">
        <WizardTextarea
          id="daily-workout-incomplete-reason"
          ariaLabel="What prevented you from completing yesterday’s workout?"
          value={
            form.workout_incomplete_reason
          }
          onChange={(value) =>
            setField(
              'workout_incomplete_reason',
              value,
            )
          }
          placeholder="Tell your coach what got in the way."
        />
      </WizardQuestion>
    )
  }

  if (step === STEP.TRAINING_PROBLEM) {
    return (
      <WizardQuestion title="Did you have any pain, difficulty, or problems during yesterday’s training?">
        <WizardChoiceGroup
          name="training-problem"
          value={form.training_problem}
          options={YES_NO_OPTIONS}
          onChange={(value) =>
            setField(
              'training_problem',
              value,
            )
          }
        />
      </WizardQuestion>
    )
  }

  if (
    step ===
    STEP.TRAINING_PROBLEM_DETAILS
  ) {
    return (
      <WizardQuestion title="Describe what happened during yesterday’s training.">
        <WizardTextarea
          id="daily-training-problem-details"
          ariaLabel="Describe what happened during yesterday’s training."
          value={
            form.training_problem_details
          }
          onChange={(value) =>
            setField(
              'training_problem_details',
              value,
            )
          }
          placeholder="Include where you felt it, what movement caused it, and anything else your coach should know."
        />
      </WizardQuestion>
    )
  }

  if (step === STEP.CARDIO) {
    const cardioTarget =
      target
        ?.weekly_cardio_target_minutes ?? 0

    return (
      <WizardQuestion
        title="How many minutes of cardio did you complete yesterday?"
        helper={
          <>
            This week:{' '}
            <strong>{cardioCompleted}</strong>{' '}
            of{' '}
            <strong>{cardioTarget}</strong>{' '}
            minutes
          </>
        }
      >
        <WizardNumberField
          id="daily-cardio-minutes"
          label="Cardio"
          value={form.cardio_minutes}
          suffix="minutes"
          min="0"
          max="600"
          step="1"
          inputMode="numeric"
          integerOnly
          selectAllOnFocus={
            String(form.cardio_minutes) === '0'
          }
          feedback={
            validationByField
              .cardio_minutes?.message
          }
          state={
            validationByField
              .cardio_minutes?.displayState
          }
          onChange={(value) =>
            setField(
              'cardio_minutes',
              value,
            )
          }
        />

        {Number(form.cardio_minutes) > 0 && (
          <div className="cardio-details">
            <div className="cardio-select-field">
              <label htmlFor="daily-cardio-type">
                Cardio type
              </label>

              <select
                id="daily-cardio-type"
                aria-label="Cardio type"
                className={`interaction-field ${
                  form.cardio_type
                    ? 'has-answer'
                    : 'needs-answer'
                }`}
                value={form.cardio_type ?? ''}
                onChange={(event) =>
                  setField(
                    'cardio_type',
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Choose cardio type
                </option>

                {CARDIO_TYPE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="cardio-effort-field">
              <p>Effort</p>

              <div
                className="cardio-effort-options"
                role="radiogroup"
                aria-label="Cardio effort"
              >
                {CARDIO_INTENSITY_OPTIONS.map(
                  (option) => (
                    <label
                      key={option.value}
                      className="cardio-effort-option"
                    >
                      <input
                        type="radio"
                        name="cardio-intensity"
                        value={option.value}
                        checked={
                          form.cardio_intensity ===
                          option.value
                        }
                        onChange={() =>
                          setField(
                            'cardio_intensity',
                            option.value,
                          )
                        }
                      />

                      <span>
                        {option.label}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>
          </div>
        )}
      </WizardQuestion>
    )
  }

  if (step === STEP.WATER) {
    const waterGoal =
      target?.daily_water_goal_oz ?? 0

    return (
      <WizardQuestion
        title="Did you hit your water goal yesterday?"
        helper={
          <>
            Your goal:{' '}
            <strong>{waterGoal} oz</strong>
          </>
        }
      >
        <WizardChoiceGroup
          name="water-goal"
          value={form.water_goal_met}
          options={YES_NO_OPTIONS}
          onChange={(value) =>
            setField(
              'water_goal_met',
              value,
            )
          }
        />
      </WizardQuestion>
    )
  }

  if (step === STEP.ALCOHOL) {
    return (
      <WizardQuestion title="Did you drink alcohol yesterday?">
        <WizardChoiceGroup
          name="alcohol"
          value={form.alcohol_consumed}
          options={YES_NO_OPTIONS}
          onChange={(value) =>
            setField(
              'alcohol_consumed',
              value,
            )
          }
        />
      </WizardQuestion>
    )
  }

  if (step === STEP.ALCOHOL_DETAILS) {
    return (
      <WizardQuestion title="What did you drink yesterday, and how much?">
        <WizardTextarea
          id="daily-alcohol-details"
          ariaLabel="What did you drink yesterday, and how much?"
          value={form.alcohol_details}
          onChange={(value) =>
            setField(
              'alcohol_details',
              value,
            )
          }
          placeholder="Example: two 5 oz glasses of wine, three vodka shots, or two beers."
        />
      </WizardQuestion>
    )
  }

  return (
    <WizardQuestion
      title="Do you have any questions for your coach, or anything else you’d like them to know?"
      helper="Optional — leave blank and tap Review Answers."
    >
      <WizardTextarea
        id="daily-coach-notes"
        ariaLabel="Questions or notes for your coach"
        value={form.coach_notes ?? ''}
        onChange={(value) =>
          setField(
            'coach_notes',
            value,
          )
        }
        placeholder="Questions, poor sleep, unusual stress, illness, upcoming travel, schedule changes, meal or workout concerns, or anything else your coach should know."
        optional
        promptWhenEmpty
      />
    </WizardQuestion>
  )
}
