import { useEffect, useRef, useState } from 'react'
import {
  AnswerSlider,
  ChoiceButtons,
  FocusedTextarea,
} from './QuestionControls'
import { DAILY_CHECKIN_STEP_IDS as STEP } from '../../utils/dailyCheckInFlow'

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

const NO_WEIGHT_OPTIONS = [
  {
    value: 'traveling',
    label: 'Traveling',
  },
  {
    value: 'no_scale',
    label: 'No scale available',
  },
  {
    value: 'scale_issue',
    label: 'Scale problem / broken scale',
  },
  {
    value: 'skipped',
    label: 'Skipped weighing this morning',
  },
]

const CHEAT_MEAL_OPTIONS = [
  {
    value: 'eaten',
    label: 'Yes',
  },
  {
    value: 'not_eaten',
    label: 'No',
  },
  {
    value: 'not_planned',
    label: 'No cheat meal was planned',
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

// Displays one question from the branching daily check-in flow.
export function DailyCheckInStep({
  step,
  form,
  setField,
  target,
  cardioCompleted,
}) {
  const hasNoWeight =
    form.weight_status &&
    form.weight_status !== 'recorded'

  const [showNoWeightReasons, setShowNoWeightReasons] =
    useState(Boolean(hasNoWeight))

  const weightInputRef = useRef(null)

  useEffect(() => {
    if (step !== STEP.WEIGHT) return

    setShowNoWeightReasons(Boolean(hasNoWeight))
  }, [step, hasNoWeight])

  useEffect(() => {
    if (
      step === STEP.WEIGHT &&
      !showNoWeightReasons
    ) {
      weightInputRef.current?.focus()
    }
  }, [step, showNoWeightReasons])

  function changeWeight(value) {
    setField('morning_weight', value)

    setField(
      'weight_status',
      value === '' ? '' : 'recorded',
    )
  }

  function chooseNoWeightReason(value) {
    setField('morning_weight', '')
    setField('weight_status', value)
  }

  function enterWeightInstead() {
    setField('weight_status', '')
    setField('morning_weight', '')
    setShowNoWeightReasons(false)
  }

  if (step === STEP.WEIGHT) {
    if (showNoWeightReasons) {
      return (
        <fieldset>
          <legend>
            Why don’t you have a weight today?
          </legend>

          <ChoiceButtons
            name="weight-status"
            value={form.weight_status}
            options={NO_WEIGHT_OPTIONS}
            onChange={chooseNoWeightReason}
          />

          <button
            type="button"
            className="text-button"
            onClick={enterWeightInstead}
          >
            Enter a weight instead
          </button>
        </fieldset>
      )
    }

    return (
      <fieldset>
        <legend>
          What was your weight this morning?
        </legend>

        <div className="number-answer">
          <input
            ref={weightInputRef}
            type="number"
            min="1"
            step="0.1"
            inputMode="decimal"
            value={form.morning_weight}
            onChange={(event) =>
              changeWeight(event.target.value)
            }
          />

          <span>lbs</span>
        </div>

        <p className="answer-divider">or</p>

        <button
          type="button"
          onClick={() =>
            setShowNoWeightReasons(true)
          }
        >
          I don’t have a weight today
        </button>
      </fieldset>
    )
  }

  if (step === STEP.MEAL_PLAN_SCORE) {
    return (
      <fieldset>
        <legend>
          How closely did you follow your meal plan
          yesterday?
        </legend>

        <AnswerSlider
          name="meal-plan-score"
          value={form.meal_plan_score}
          labels={MEAL_PLAN_LABELS}
          onChange={(value) =>
            setField('meal_plan_score', value)
          }
        />
      </fieldset>
    )
  }

  if (step === STEP.MEAL_PLAN_DEVIATION) {
    return (
      <fieldset>
        <legend>
          What was different from yesterday’s meal
          plan, and why?
        </legend>

        <FocusedTextarea
          focusKey={step}
          value={form.meal_plan_deviation_details}
          onChange={(value) =>
            setField(
              'meal_plan_deviation_details',
              value,
            )
          }
          placeholder="Include anything you added, skipped, substituted, ate in a different amount, or any planned meal you did not eat."
        />
      </fieldset>
    )
  }

  if (step === STEP.CHEAT_MEAL) {
    return (
      <fieldset>
        <legend>
          Was one of yesterday’s meals your planned
          cheat meal?
        </legend>

        <ChoiceButtons
          name="cheat-meal"
          value={form.planned_cheat_meal_status}
          options={CHEAT_MEAL_OPTIONS}
          onChange={(value) =>
            setField(
              'planned_cheat_meal_status',
              value,
            )
          }
        />
      </fieldset>
    )
  }

  if (step === STEP.HUNGER) {
    return (
      <fieldset>
        <legend>
          How hungry were you overall yesterday?
        </legend>

        <AnswerSlider
          name="hunger-score"
          value={form.hunger_score}
          labels={HUNGER_LABELS}
          onChange={(value) =>
            setField('hunger_score', value)
          }
          reversed
        />
      </fieldset>
    )
  }

  if (step === STEP.WATER) {
    return (
      <fieldset>
        <legend>
          Did you hit your water goal yesterday?
        </legend>

        <p>
          Your goal:{' '}
          <strong>
            {target?.daily_water_goal_oz ?? 0} oz
          </strong>
        </p>

        <ChoiceButtons
          name="water-goal"
          value={form.water_goal_met}
          options={YES_NO_OPTIONS}
          onChange={(value) =>
            setField('water_goal_met', value)
          }
        />
      </fieldset>
    )
  }

  if (step === STEP.WORKOUT_STATUS) {
    return (
      <fieldset>
        <legend>
          Did you complete your scheduled workout
          yesterday?
        </legend>

        <ChoiceButtons
          name="workout-status"
          value={form.workout_status}
          options={WORKOUT_OPTIONS}
          onChange={(value) =>
            setField('workout_status', value)
          }
        />
      </fieldset>
    )
  }

  if (step === STEP.WORKOUT_INCOMPLETE_REASON) {
    return (
      <fieldset>
        <legend>
          What prevented you from completing
          yesterday’s workout?
        </legend>

        <FocusedTextarea
          focusKey={step}
          value={form.workout_incomplete_reason}
          onChange={(value) =>
            setField(
              'workout_incomplete_reason',
              value,
            )
          }
          placeholder="Tell your coach what got in the way."
        />
      </fieldset>
    )
  }

  if (step === STEP.TRAINING_PROBLEM) {
    return (
      <fieldset>
        <legend>
          Did you have any pain, difficulty, or
          problems during yesterday’s training?
        </legend>

        <ChoiceButtons
          name="training-problem"
          value={form.training_problem}
          options={YES_NO_OPTIONS}
          onChange={(value) =>
            setField('training_problem', value)
          }
        />
      </fieldset>
    )
  }

  if (step === STEP.TRAINING_PROBLEM_DETAILS) {
    return (
      <fieldset>
        <legend>
          Describe what happened during yesterday’s
          training.
        </legend>

        <FocusedTextarea
          focusKey={step}
          value={form.training_problem_details}
          onChange={(value) =>
            setField(
              'training_problem_details',
              value,
            )
          }
          placeholder="Include where you felt it, what movement caused it, and anything else your coach should know."
        />
      </fieldset>
    )
  }

  if (step === STEP.CARDIO) {
    const cardioTarget =
      target?.weekly_cardio_target_minutes ?? 0

    return (
      <fieldset>
        <legend>
          How many minutes of cardio did you complete
          yesterday?
        </legend>

        <p>
          This week: <strong>{cardioCompleted}</strong>{' '}
          of <strong>{cardioTarget}</strong> minutes
        </p>

        <div className="number-answer">
          <input
            type="number"
            min="0"
            max="1440"
            step="1"
            inputMode="numeric"
            value={form.cardio_minutes}
            onChange={(event) =>
              setField(
                'cardio_minutes',
                event.target.value,
              )
            }
          />

          <span>minutes</span>
        </div>
      </fieldset>
    )
  }

  if (step === STEP.ALCOHOL) {
    return (
      <fieldset>
        <legend>
          Did you drink alcohol yesterday?
        </legend>

        <ChoiceButtons
          name="alcohol"
          value={form.alcohol_consumed}
          options={YES_NO_OPTIONS}
          onChange={(value) =>
            setField('alcohol_consumed', value)
          }
        />
      </fieldset>
    )
  }

  if (step === STEP.ALCOHOL_DETAILS) {
    return (
      <fieldset>
        <legend>
          What did you drink yesterday, and how much?
        </legend>

        <FocusedTextarea
          focusKey={step}
          value={form.alcohol_details}
          onChange={(value) =>
            setField('alcohol_details', value)
          }
          placeholder="Example: two 5 oz glasses of wine, three vodka shots, or two beers."
        />
      </fieldset>
    )
  }

  if (step === STEP.ADDITIONAL_NOTES) {
    return (
      <fieldset>
        <legend>
          Is there anything else you would like to
          share with your coach?
        </legend>

        <FocusedTextarea
          focusKey={step}
          value={form.additional_notes}
          onChange={(value) =>
            setField('additional_notes', value)
          }
          placeholder="Poor sleep, unusual stress, illness, upcoming travel, a schedule change, a meal or workout concern, or anything else that may affect your plan."
          optional
        />
      </fieldset>
    )
  }

  return (
    <fieldset>
      <legend>
        Do you have any questions for your coach?
      </legend>

      <FocusedTextarea
        focusKey={step}
        value={form.questions_for_coach}
        onChange={(value) =>
          setField('questions_for_coach', value)
        }
        placeholder="Enter any questions you would like your coach to review."
        optional
      />
    </fieldset>
  )
}