import {
  dateKeyToUtcMilliseconds,
  getFirstWeeklyCheckInDate,
} from './dates'
import {
  DAILY_CHECKIN_STEP_IDS,
  getDailyCheckInSteps,
} from './dailyCheckInFlow'

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000

export const WEEKLY_CHECKIN_STEP_IDS = {
  RECOVERY: 'weekly:recovery',
  MEASUREMENTS: 'weekly:measurements',
  BODY_FAT: 'weekly:body-fat',
  MENSTRUAL_CONTEXT: 'weekly:menstrual-context',
  PHOTOS: 'weekly:photos',
  REFLECTION: 'weekly:reflection',
}

export function toWeeklyDailyStep(dailyStep) {
  return `daily:${dailyStep}`
}

export function fromWeeklyDailyStep(step) {
  return step?.startsWith('daily:')
    ? step.slice('daily:'.length)
    : null
}

export function getWeeklyCheckInNumber(
  startDate,
  checkinDay,
  checkinDate,
) {
  const firstWeeklyDate =
    getFirstWeeklyCheckInDate(
      startDate,
      checkinDay,
    )

  if (
    !firstWeeklyDate ||
    !checkinDate ||
    checkinDate < firstWeeklyDate
  ) {
    return null
  }

  const daysSinceFirst = Math.floor(
    (dateKeyToUtcMilliseconds(checkinDate) -
      dateKeyToUtcMilliseconds(
        firstWeeklyDate,
      )) /
      MILLISECONDS_PER_DAY,
  )

  if (daysSinceFirst % 7 !== 0) {
    return null
  }

  return Math.floor(daysSinceFirst / 7) + 1
}

export function getWeeklyCheckInSteps(
  form,
  {
    bodyFatSource,
    sex,
    photosRequired,
  } = {},
) {
  const dailySteps =
    getDailyCheckInSteps(form).map(
      toWeeklyDailyStep,
    )

  if (bodyFatSource === 'scale') {
    const weightStep =
      toWeeklyDailyStep(
        DAILY_CHECKIN_STEP_IDS.WEIGHT,
      )

    const weightStepIndex =
      dailySteps.indexOf(weightStep)

    dailySteps.splice(
      weightStepIndex + 1,
      0,
      WEEKLY_CHECKIN_STEP_IDS.BODY_FAT,
    )
  }

  const weeklySteps = [
    WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
    WEEKLY_CHECKIN_STEP_IDS.MEASUREMENTS,
  ]

  if (
    bodyFatSource === 'juntos_estimate'
  ) {
    weeklySteps.push(
      WEEKLY_CHECKIN_STEP_IDS.BODY_FAT,
    )
  }

  if (sex === 'female') {
    weeklySteps.push(
      WEEKLY_CHECKIN_STEP_IDS
        .MENSTRUAL_CONTEXT,
    )
  }

  if (photosRequired) {
    weeklySteps.push(
      WEEKLY_CHECKIN_STEP_IDS.PHOTOS,
    )
  }

  weeklySteps.push(
    WEEKLY_CHECKIN_STEP_IDS.REFLECTION,
  )

  return [...dailySteps, ...weeklySteps]
}

function isPositiveNumber(value) {
  const number = Number(value)

  return Number.isFinite(number) && number > 0
}

function isScore(value) {
  const number = Number(value)

  return (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 5
  )
}

export function canContinueWeeklyStep(
  step,
  form,
  {
    bodyFatSource,
    photosRequired,
    photos,
    previewMode = false,
  } = {},
) {
  const dailyStep =
    fromWeeklyDailyStep(step)

  if (dailyStep) {
    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.WEIGHT
    ) {
      if (!form.weight_status) {
        return false
      }

      return form.weight_status === 'recorded'
        ? isPositiveNumber(
            form.morning_weight,
          )
        : true
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_SCORE
    ) {
      return form.meal_plan_score !== ''
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS
        .MEAL_PLAN_DEVIATION
    ) {
      return Boolean(
        form.meal_plan_deviation_details?.trim(),
      )
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.CHEAT_MEAL
    ) {
      return Boolean(
        form.planned_cheat_meal_status,
      )
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.HUNGER
    ) {
      return form.hunger_score !== ''
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.WATER
    ) {
      return form.water_goal_met !== null
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.WORKOUT_STATUS
    ) {
      return Boolean(form.workout_status)
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS
        .WORKOUT_INCOMPLETE_REASON
    ) {
      return Boolean(
        form.workout_incomplete_reason?.trim(),
      )
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.TRAINING_PROBLEM
    ) {
      return form.training_problem !== null
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS
        .TRAINING_PROBLEM_DETAILS
    ) {
      return Boolean(
        form.training_problem_details?.trim(),
      )
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.CARDIO
    ) {
      const minutes = Number(
        form.cardio_minutes,
      )

      return (
        Number.isInteger(minutes) &&
        minutes >= 0 &&
        minutes <= 1440
      )
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.ALCOHOL
    ) {
      return form.alcohol_consumed !== null
    }

    if (
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.ALCOHOL_DETAILS
    ) {
      return Boolean(
        form.alcohol_details?.trim(),
      )
    }

    return true
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.RECOVERY
  ) {
    return [
      form.sleep_quality,
      form.energy_level,
      form.recovery_score,
      form.stress_level,
    ].every(isScore)
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.MEASUREMENTS
  ) {
    return [
      form.neck_inches,
      form.waist_inches,
      form.hips_inches,
      form.bicep_inches,
      form.thigh_inches,
      form.calf_inches,
    ].every(isPositiveNumber)
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.BODY_FAT
  ) {
    if (bodyFatSource === 'scale') {
      if (!form.body_fat_status) {
        return false
      }

      return form.body_fat_status ===
        'recorded'
        ? isPositiveNumber(
            form.scale_body_fat_percent,
          ) &&
            Number(
              form.scale_body_fat_percent,
            ) <= 100
        : form.body_fat_status ===
            'no_reading'
    }

    return true
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.PHOTOS
  ) {
    if (!photosRequired || previewMode) {
      return true
    }

    return Boolean(
      photos?.front &&
        photos?.side &&
        photos?.back,
    )
  }

  return true
}
