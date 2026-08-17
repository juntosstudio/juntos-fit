import {
  normalizeCheckInSettings,
} from './checkInTracking'
import {
  isCardioIntensity,
  isCardioType,
} from './cardio'
import {
  canContinueMeasurementFields,
  getCheckInMeasurementValidation,
} from './measurementValidation'

export const DAILY_CHECKIN_STEP_IDS = {
  WEIGHT: 'weight',
  MEAL_PLAN_SCORE: 'meal-plan-score',
  CHEAT_MEAL: 'cheat-meal',
  MEAL_PLAN_DEVIATION: 'meal-plan-deviation',
  HUNGER: 'hunger',
  WORKOUT_STATUS: 'workout-status',
  WORKOUT_INCOMPLETE_REASON:
    'workout-incomplete-reason',
  TRAINING_PROBLEM: 'training-problem',
  TRAINING_PROBLEM_DETAILS:
    'training-problem-details',
  CARDIO: 'cardio',
  WATER: 'water',
  ALCOHOL: 'alcohol',
  ALCOHOL_DETAILS: 'alcohol-details',
  COACH_NOTES: 'coach-notes',

  // Retained temporarily so older imports do not break.
  ADDITIONAL_NOTES: 'additional-notes',
  QUESTIONS_FOR_COACH: 'questions-for-coach',
}

export const MEAL_PLAN_DEVIATION_TYPES = {
  CHEAT_ONLY: 'cheat_only',
  CHEAT_PLUS: 'cheat_plus',
  NO_CHEAT: 'no_cheat',
}

export function getDailyCheckInSteps(
  form,
  trackingSettings,
) {
  const {
    track_water: trackWater,
    track_alcohol: trackAlcohol,
  } = normalizeCheckInSettings(
    trackingSettings,
  )
  const steps = [
    DAILY_CHECKIN_STEP_IDS.WEIGHT,
    DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_SCORE,
  ]

  const mealPlanScore = Number(
    form.meal_plan_score,
  )

  if (
    mealPlanScore >= 1 &&
    mealPlanScore <= 4
  ) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS.CHEAT_MEAL,
    )

    if (
      [
        MEAL_PLAN_DEVIATION_TYPES
          .CHEAT_PLUS,
        MEAL_PLAN_DEVIATION_TYPES
          .NO_CHEAT,
      ].includes(
        form.meal_plan_deviation_type,
      )
    ) {
      steps.push(
        DAILY_CHECKIN_STEP_IDS
          .MEAL_PLAN_DEVIATION,
      )
    }
  }

  steps.push(
    DAILY_CHECKIN_STEP_IDS.HUNGER,
    DAILY_CHECKIN_STEP_IDS.WORKOUT_STATUS,
  )

  if (
    form.workout_status === 'missed'
  ) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS
        .WORKOUT_INCOMPLETE_REASON,
    )
  }

  const workoutWasAttempted = [
    'completed',
    'partial',
  ].includes(form.workout_status)

  if (workoutWasAttempted) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS
        .TRAINING_PROBLEM,
    )
  }

  if (
    workoutWasAttempted &&
    form.training_problem === true
  ) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS
        .TRAINING_PROBLEM_DETAILS,
    )
  }

  steps.push(
    DAILY_CHECKIN_STEP_IDS.CARDIO,
  )

  if (trackWater) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS.WATER,
    )
  }

  if (trackAlcohol) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS.ALCOHOL,
    )
  }

  if (
    trackAlcohol &&
    form.alcohol_consumed === true
  ) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS
        .ALCOHOL_DETAILS,
    )
  }

  steps.push(
    DAILY_CHECKIN_STEP_IDS.COACH_NOTES,
  )

  return steps
}

function isScore(value) {
  const number = Number(value)

  return (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 5
  )
}

export function canContinueDailyStep(
  step,
  form,
  {
    validationByField = {},
  } = {},
) {
  if (
    step ===
    DAILY_CHECKIN_STEP_IDS.WEIGHT
  ) {
    if (!form.weight_status) {
      return false
    }

    if (
      form.weight_status !== 'recorded'
    ) {
      return true
    }

    if (
      validationByField.morning_weight
    ) {
      return canContinueMeasurementFields(
        ['morning_weight'],
        validationByField,
      )
    }

    const weight = Number(
      form.morning_weight,
    )

    return (
      Number.isFinite(weight) &&
      weight > 0
    )
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_SCORE
  ) {
    return isScore(form.meal_plan_score)
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS.CHEAT_MEAL
  ) {
    return [
      MEAL_PLAN_DEVIATION_TYPES
        .CHEAT_ONLY,
      MEAL_PLAN_DEVIATION_TYPES
        .CHEAT_PLUS,
      MEAL_PLAN_DEVIATION_TYPES
        .NO_CHEAT,
    ].includes(
      form.meal_plan_deviation_type,
    )
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS
      .MEAL_PLAN_DEVIATION
  ) {
    return Boolean(
      form
        .meal_plan_deviation_details
        ?.trim(),
    )
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS.HUNGER
  ) {
    return isScore(form.hunger_score)
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS.WORKOUT_STATUS
  ) {
    return Boolean(form.workout_status)
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS
      .WORKOUT_INCOMPLETE_REASON
  ) {
    return Boolean(
      form
        .workout_incomplete_reason
        ?.trim(),
    )
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS
      .TRAINING_PROBLEM
  ) {
    return form.training_problem !== null
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS
      .TRAINING_PROBLEM_DETAILS
  ) {
    return Boolean(
      form
        .training_problem_details
        ?.trim(),
    )
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS.CARDIO
  ) {
    let minutesAreValid

    if (
      validationByField.cardio_minutes
    ) {
      minutesAreValid =
        canContinueMeasurementFields(
          ['cardio_minutes'],
          validationByField,
        )
    } else {
      const validation =
        getCheckInMeasurementValidation({
          formField: 'cardio_minutes',
          value: form.cardio_minutes,
          unitSystem: 'imperial',
          label: 'Cardio',
        })

      minutesAreValid = ![
        'unanswered',
        'invalid',
      ].includes(validation.status)
    }

    if (!minutesAreValid) {
      return false
    }

    const minutes = Number(
      form.cardio_minutes,
    )

    if (minutes <= 0) {
      return true
    }

    if (
      form._allow_legacy_cardio_context
    ) {
      return true
    }

    return (
      isCardioType(form.cardio_type) &&
      isCardioIntensity(
        form.cardio_intensity,
      )
    )
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS.WATER
  ) {
    return form.water_goal_met !== null
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS.ALCOHOL
  ) {
    return (
      form.alcohol_consumed !== null
    )
  }

  if (
    step ===
    DAILY_CHECKIN_STEP_IDS
      .ALCOHOL_DETAILS
  ) {
    return Boolean(
      form.alcohol_details?.trim(),
    )
  }

  // Coach notes are optional.
  return true
}

export function getFirstInvalidDailyStep(
  form,
  options = {},
) {
  return getDailyCheckInSteps(
    form,
    options.trackingSettings,
  ).find(
    (step) =>
      !canContinueDailyStep(
        step,
        form,
        options,
      ),
  ) ?? null
}

export function getDailyCheckInValidationError(
  form,
  {
    unitSystem = 'imperial',
    trackingSettings,
  } = {},
) {
  const weightValidation =
    getCheckInMeasurementValidation({
      formField: 'morning_weight',
      value: form.morning_weight,
      unitSystem,
      label: 'Morning weight',
    })

  const cardioValidation =
    getCheckInMeasurementValidation({
      formField: 'cardio_minutes',
      value: form.cardio_minutes,
      unitSystem,
      label: 'Cardio',
    })

  const validationByField = {
    morning_weight: weightValidation,
    cardio_minutes: cardioValidation,
  }

  const invalidStep =
    getFirstInvalidDailyStep(
      form,
      {
        validationByField,
        trackingSettings,
      },
    )

  if (!invalidStep) {
    return ''
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS.WEIGHT
  ) {
    if (!form.weight_status) {
      return (
        'Enter your morning weight or choose why you ' +
        'do not have one today.'
      )
    }

    if (
      form.weight_status === 'recorded' &&
      weightValidation.status ===
        'unanswered'
    ) {
      return 'Enter your morning weight.'
    }

    return (
      weightValidation.message ||
      'Enter a valid morning weight.'
    )
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_SCORE
  ) {
    return (
      'Choose how closely you followed your meal plan.'
    )
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS.CHEAT_MEAL
  ) {
    return (
      'Choose which description best matches your ' +
      'meal-plan deviations.'
    )
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS
      .MEAL_PLAN_DEVIATION
  ) {
    return (
      'Describe what else was different from your ' +
      'meal plan and why.'
    )
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS.HUNGER
  ) {
    return 'Choose your overall hunger level.'
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS.WORKOUT_STATUS
  ) {
    return 'Choose your workout status.'
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS
      .WORKOUT_INCOMPLETE_REASON
  ) {
    return (
      'Describe what prevented you from completing ' +
      'your workout.'
    )
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS
      .TRAINING_PROBLEM
  ) {
    return (
      'Choose whether you had a training problem.'
    )
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS
      .TRAINING_PROBLEM_DETAILS
  ) {
    return (
      'Describe what happened during training.'
    )
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS.CARDIO
  ) {
    if (
      cardioValidation.message
    ) {
      return cardioValidation.message
    }

    if (
      Number(form.cardio_minutes) > 0 &&
      !isCardioType(form.cardio_type)
    ) {
      return 'Choose the type of cardio you did.'
    }

    if (
      Number(form.cardio_minutes) > 0 &&
      !isCardioIntensity(
        form.cardio_intensity,
      )
    ) {
      return 'Choose how hard the cardio felt.'
    }

    return 'Enter valid cardio minutes.'
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS.WATER
  ) {
    return (
      'Choose whether you hit your water goal.'
    )
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS.ALCOHOL
  ) {
    return (
      'Choose whether you drank alcohol.'
    )
  }

  if (
    invalidStep ===
    DAILY_CHECKIN_STEP_IDS
      .ALCOHOL_DETAILS
  ) {
    return (
      'Enter what you drank and how much.'
    )
  }

  return 'Complete all required answers.'
}
