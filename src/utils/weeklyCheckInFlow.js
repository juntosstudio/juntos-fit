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
  GET_STARTED: 'weekly:get-started',
  BODY_FAT: 'weekly:body-fat',
  WAIST: 'weekly:waist',
  RECOVERY: 'weekly:recovery',
  MENSTRUAL_CONTEXT:
    'weekly:menstrual-context',
  NECK: 'weekly:neck',
  CHEST: 'weekly:chest',
  HIPS: 'weekly:hips',
  SIDE_MEASUREMENTS:
    'weekly:side-measurements',
  PHOTO_TIPS: 'weekly:photo-tips',
  FRONT_PHOTO: 'weekly:front-photo',
  SIDE_PHOTO: 'weekly:side-photo',
  BACK_PHOTO: 'weekly:back-photo',
  REFLECTION: 'weekly:reflection',

  // Legacy aliases retained temporarily so an
  // older import does not crash during the merge.
  MEASUREMENTS: 'weekly:measurements',
  PHOTOS: 'weekly:photos',
}

export function toWeeklyDailyStep(
  dailyStep,
) {
  return `daily:${dailyStep}`
}

export function fromWeeklyDailyStep(
  step,
) {
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
    (dateKeyToUtcMilliseconds(
      checkinDate,
    ) -
      dateKeyToUtcMilliseconds(
        firstWeeklyDate,
      )) /
      MILLISECONDS_PER_DAY,
  )

  if (daysSinceFirst % 7 !== 0) {
    return null
  }

  return (
    Math.floor(daysSinceFirst / 7) + 1
  )
}

export function getPreviewWeeklyCheckInNumber(
  startDate,
  checkinDay,
  currentDate,
) {
  const exactNumber =
    getWeeklyCheckInNumber(
      startDate,
      checkinDay,
      currentDate,
    )

  if (exactNumber) {
    return exactNumber
  }

  const firstWeeklyDate =
    getFirstWeeklyCheckInDate(
      startDate,
      checkinDay,
    )

  if (!firstWeeklyDate || !currentDate) {
    return null
  }

  if (currentDate < firstWeeklyDate) {
    return 1
  }

  const daysSinceFirst = Math.floor(
    (dateKeyToUtcMilliseconds(
      currentDate,
    ) -
      dateKeyToUtcMilliseconds(
        firstWeeklyDate,
      )) /
      MILLISECONDS_PER_DAY,
  )

  return (
    Math.floor(daysSinceFirst / 7) +
    (daysSinceFirst % 7 === 0 ? 1 : 2)
  )
}

export function isFullWeeklyMeasurementCheckIn({
  weekNumber,
  programLengthWeeks,
  photoFrequencyWeeks = 4,
}) {
  const week = Number(weekNumber)
  const length = Number(programLengthWeeks)
  const frequency =
    Number(photoFrequencyWeeks) || 4

  if (
    !Number.isInteger(week) ||
    week < 1
  ) {
    return false
  }

  const isFinal =
    Number.isInteger(length) &&
    length > 0 &&
    week >= length

  return (
    isFinal ||
    week % frequency === 0
  )
}

export function getWeeklyCheckInSteps(
  form,
  {
    bodyFatSource,
    sex,
    photosRequired,
    trackingSettings,
  } = {},
) {
  const dailyStepIds =
    getDailyCheckInSteps(
      form,
      trackingSettings,
    ).filter(
      (step) =>
        step !==
        DAILY_CHECKIN_STEP_IDS.COACH_NOTES,
    )

  const weightIndex =
    dailyStepIds.indexOf(
      DAILY_CHECKIN_STEP_IDS.WEIGHT,
    )

  const steps = [
    WEEKLY_CHECKIN_STEP_IDS.GET_STARTED,
    toWeeklyDailyStep(
      DAILY_CHECKIN_STEP_IDS.WEIGHT,
    ),
  ]

  if (bodyFatSource === 'scale') {
    steps.push(
      WEEKLY_CHECKIN_STEP_IDS.BODY_FAT,
    )
  }

  // Waist appears near the beginning on regular
  // weeks. On photo/full-measurement weeks it moves
  // into the measurement sequence below.
  if (!photosRequired) {
    steps.push(
      WEEKLY_CHECKIN_STEP_IDS.WAIST,
    )
  }

  const remainingDailySteps =
    weightIndex >= 0
      ? dailyStepIds.slice(weightIndex + 1)
      : dailyStepIds

  steps.push(
    ...remainingDailySteps.map(
      toWeeklyDailyStep,
    ),
    WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
  )

  if (sex === 'female') {
    steps.push(
      WEEKLY_CHECKIN_STEP_IDS
        .MENSTRUAL_CONTEXT,
    )
  }

  if (photosRequired) {
    steps.push(
      WEEKLY_CHECKIN_STEP_IDS.NECK,
      WEEKLY_CHECKIN_STEP_IDS.CHEST,
      WEEKLY_CHECKIN_STEP_IDS.WAIST,
      WEEKLY_CHECKIN_STEP_IDS.HIPS,
      WEEKLY_CHECKIN_STEP_IDS
        .SIDE_MEASUREMENTS,
      WEEKLY_CHECKIN_STEP_IDS
        .PHOTO_TIPS,
      WEEKLY_CHECKIN_STEP_IDS
        .FRONT_PHOTO,
      WEEKLY_CHECKIN_STEP_IDS
        .SIDE_PHOTO,
      WEEKLY_CHECKIN_STEP_IDS
        .BACK_PHOTO,
    )
  }

  steps.push(
    WEEKLY_CHECKIN_STEP_IDS.REFLECTION,
  )

  return steps
}

function isPositiveNumber(value) {
  const number = Number(value)

  return (
    Number.isFinite(number) &&
    number > 0
  )
}

function isScore(value) {
  const number = Number(value)

  return (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 5
  )
}

export function getWeeklyStepMeasurementFields(
  step,
) {
  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.WAIST
  ) {
    return ['waist_inches']
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.NECK
  ) {
    return ['neck_inches']
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.CHEST
  ) {
    return ['chest_inches']
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.HIPS
  ) {
    return ['hips_inches']
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS
      .SIDE_MEASUREMENTS
  ) {
    return [
      'bicep_inches',
      'thigh_inches',
      'calf_inches',
    ]
  }

  return []
}

function getPhotoPoseForStep(step) {
  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.FRONT_PHOTO
  ) {
    return 'front'
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.SIDE_PHOTO
  ) {
    return 'side'
  }

  if (
    step ===
    WEEKLY_CHECKIN_STEP_IDS.BACK_PHOTO
  ) {
    return 'back'
  }

  return null
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

  const measurementFields =
    getWeeklyStepMeasurementFields(step)

  if (measurementFields.length > 0) {
    if (
      measurementFields.every(
        (field) =>
          validationByField[field],
      )
    ) {
      return canContinueMeasurementFields(
        measurementFields,
        validationByField,
      )
    }

    return measurementFields.every(
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

      if (
        validationByField
          .scale_body_fat_percent
      ) {
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

  const photoPose =
    getPhotoPoseForStep(step)

  if (photoPose) {
    if (!photosRequired || previewMode) {
      return true
    }

    return Boolean(photos?.[photoPose])
  }

  // Menstrual context, photo tips, and the final
  // reflection are optional/informational.
  return true
}
