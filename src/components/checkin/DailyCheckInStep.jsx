import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  WizardChoiceGroup,
  WizardNumberField,
  WizardQuestion,
  WizardSlider,
  WizardTextarea,
} from '../wizard'
import {
  DAILY_CHECKIN_STEP_IDS as STEP,
} from '../../utils/dailyCheckInFlow'

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

// Displays one question from the existing branching
// Daily Check-In flow using the shared wizard UI.
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

  const [
    showNoWeightReasons,
    setShowNoWeightReasons,
  ] = useState(Boolean(hasNoWeight))

  const weightInputRef = useRef(null)

  useEffect(() => {
    if (step !== STEP.WEIGHT) return

    setShowNoWeightReasons(
      Boolean(hasNoWeight),
    )
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
        <WizardQuestion title="Why don’t you have a weight today?">
          <WizardChoiceGroup
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
        </WizardQuestion>
      )
    }

    return (
      <WizardQuestion title="What was your weight this morning?">
        <WizardNumberField
          id="daily-morning-weight"
          inputRef={weightInputRef}
          label="Morning weight"
          value={form.morning_weight}
          suffix="lbs"
          min="1"
          step="0.1"
          onChange={changeWeight}
        />

        <p className="answer-divider">or</p>

        <button
          type="button"
          onClick={() =>
            setShowNoWeightReasons(true)
          }
        >
          I don’t have a weight today
        </button>
      </WizardQuestion>
    )
  }

  if (step === STEP.MEAL_PLAN_SCORE) {
    return (
      <WizardQuestion title="How closely did you follow your meal plan yesterday?">
        <WizardSlider
          name="meal-plan-score"
          value={form.meal_plan_score}
          labels={MEAL_PLAN_LABELS}
          onChange={(value) =>
            setField(
              'meal_plan_score',
              value,
            )
          }
        />
      </WizardQuestion>
    )
  }

  if (step === STEP.MEAL_PLAN_DEVIATION) {
    return (
      <WizardQuestion title="What was different from yesterday’s meal plan, and why?">
        <WizardTextarea
          id="daily-meal-plan-deviation"
          ariaLabel="What was different from yesterday’s meal plan, and why?"
          value={
            form.meal_plan_deviation_details
          }
          onChange={(value) =>
            setField(
              'meal_plan_deviation_details',
              value,
            )
          }
          placeholder="Include anything you added, skipped, substituted, ate in a different amount, or any planned meal you did not eat."
        />
      </WizardQuestion>
    )
  }

  if (step === STEP.CHEAT_MEAL) {
    return (
      <WizardQuestion title="Was one of yesterday’s meals your planned cheat meal?">
        <WizardChoiceGroup
          name="cheat-meal"
          value={
            form.planned_cheat_meal_status
          }
          options={CHEAT_MEAL_OPTIONS}
          onChange={(value) =>
            setField(
              'planned_cheat_meal_status',
              value,
            )
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
          max="1440"
          step="1"
          inputMode="numeric"
          onChange={(value) =>
            setField(
              'cardio_minutes',
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

  if (step === STEP.ADDITIONAL_NOTES) {
    return (
      <WizardQuestion
        title="Is there anything else you would like to share with your coach?"
        helper="Optional — leave blank and tap Next."
      >
        <WizardTextarea
          id="daily-additional-notes"
          ariaLabel="Anything else you would like to share with your coach"
          value={form.additional_notes}
          onChange={(value) =>
            setField(
              'additional_notes',
              value,
            )
          }
          placeholder="Poor sleep, unusual stress, illness, upcoming travel, a schedule change, a meal or workout concern, or anything else that may affect your plan."
          optional
          promptWhenEmpty
        />
      </WizardQuestion>
    )
  }

  return (
    <WizardQuestion
      title="Do you have any questions for your coach?"
      helper="Optional — leave blank and tap Next."
    >
      <WizardTextarea
        id="daily-questions-for-coach"
        ariaLabel="Questions for your coach"
        value={form.questions_for_coach}
        onChange={(value) =>
          setField(
            'questions_for_coach',
            value,
          )
        }
        placeholder="Enter any questions you would like your coach to review."
        optional
        promptWhenEmpty
      />
    </WizardQuestion>
  )
}
