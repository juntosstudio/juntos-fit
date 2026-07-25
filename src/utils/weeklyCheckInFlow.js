import {
  dateKeyToUtcMilliseconds,
  getFirstWeeklyCheckInDate,
} from './dates'
import {
  canContinueDailyStep,
  DAILY_CHECKIN_STEP_IDS,
  getDailyCheckInSteps,
} from './dailyCheckInFlow'
import {
  canContinueMeasurementFields,
} from './measurementValidation'

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
    validationByField = {},
  } = {},
) {
  const dailyStep =
    fromWeeklyDailyStep(step)

  if (dailyStep) {
    return canContinueDailyStep(
      dailyStep,
      form,
      { validationByField },
    )
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
    const fields = [
      'neck_inches',
      'waist_inches',
      'hips_inches',
      'bicep_inches',
      'thigh_inches',
      'calf_inches',
    ]

    if (
      fields.every(
        (field) =>
          validationByField[field],
      )
    ) {
      return canContinueMeasurementFields(
        fields,
        validationByField,
      )
    }

    return fields.every(
      (field) =>
        isPositiveNumber(form[field]),
    )
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.BODY_FAT
  ) {
    if (bodyFatSource === 'scale') {
      if (!form.body_fat_status) {
        return false
      }

      if (
        form.body_fat_status ===
        'no_reading'
      ) {
        return true
      }

      if (
        form.body_fat_status !==
        'recorded'
      ) {
        return false
      }

      const validation =
        validationByField
          .scale_body_fat_percent

      if (validation) {
        return canContinueMeasurementFields(
          ['scale_body_fat_percent'],
          validationByField,
        )
      }

      return (
        isPositiveNumber(
          form.scale_body_fat_percent,
        ) &&
        Number(
          form.scale_body_fat_percent,
        ) <= 100
      )
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
