export const DAILY_CHECKIN_STEP_IDS = {
  WEIGHT: 'weight',
  MEAL_PLAN_SCORE: 'meal-plan-score',
  MEAL_PLAN_DEVIATION: 'meal-plan-deviation',
  CHEAT_MEAL: 'cheat-meal',
  HUNGER: 'hunger',
  WATER: 'water',
  WORKOUT_STATUS: 'workout-status',
  WORKOUT_INCOMPLETE_REASON:
    'workout-incomplete-reason',
  TRAINING_PROBLEM: 'training-problem',
  TRAINING_PROBLEM_DETAILS:
    'training-problem-details',
  CARDIO: 'cardio',
  ALCOHOL: 'alcohol',
  ALCOHOL_DETAILS: 'alcohol-details',
  ADDITIONAL_NOTES: 'additional-notes',
  QUESTIONS_FOR_COACH: 'questions-for-coach',
}

// Builds the applicable one-question-at-a-time path.
export function getDailyCheckInSteps(form) {
  const steps = [
    DAILY_CHECKIN_STEP_IDS.WEIGHT,
    DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_SCORE,
  ]

  const mealPlanScore = Number(form.meal_plan_score)

  if (mealPlanScore >= 1 && mealPlanScore <= 4) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_DEVIATION,
      DAILY_CHECKIN_STEP_IDS.CHEAT_MEAL,
    );
  }

  steps.push(
    DAILY_CHECKIN_STEP_IDS.HUNGER,
    DAILY_CHECKIN_STEP_IDS.WATER,
    DAILY_CHECKIN_STEP_IDS.WORKOUT_STATUS,
  )

  // Only a missed workout needs an explanation.
  if (form.workout_status === 'missed') {
    steps.push(
      DAILY_CHECKIN_STEP_IDS.WORKOUT_INCOMPLETE_REASON,
    )
  }

  // Completed and partial workouts ask about training problems.
  const workoutWasAttempted = [
    'completed',
    'partial',
  ].includes(form.workout_status)

  if (workoutWasAttempted) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS.TRAINING_PROBLEM,
    )
  }

  if (
    workoutWasAttempted &&
    form.training_problem === true
  ) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS.TRAINING_PROBLEM_DETAILS,
    )
  }

  steps.push(
    DAILY_CHECKIN_STEP_IDS.CARDIO,
    DAILY_CHECKIN_STEP_IDS.ALCOHOL,
  )

  if (form.alcohol_consumed === true) {
    steps.push(
      DAILY_CHECKIN_STEP_IDS.ALCOHOL_DETAILS,
    )
  }

  steps.push(
    DAILY_CHECKIN_STEP_IDS.ADDITIONAL_NOTES,
    DAILY_CHECKIN_STEP_IDS.QUESTIONS_FOR_COACH,
  )

  return steps
}