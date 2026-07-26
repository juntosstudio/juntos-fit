export const START_CHECKIN_STEP_IDS = {
  TIPS: 'tips',
  WEIGHT: 'weight',
  BODY_FAT: 'body-fat',
  NECK: 'neck',
  CHEST: 'chest',
  WAIST: 'waist',
  HIPS: 'hips',
  SIDE: 'side',
  SIDE_MEASUREMENTS: 'side-measurements',
  PHOTO_TIPS: 'photo-tips',
  FRONT_PHOTO: 'front-photo',
  SIDE_PHOTO: 'side-photo',
  BACK_PHOTO: 'back-photo',
}

export const SIDE_OPTIONS = [
  {
    value: 'left',
    label: 'Left side',
  },
  {
    value: 'right',
    label: 'Right side',
  },
]

// Builds the Start Check-In path for the plan.
export function getStartCheckInSteps(plan) {
  const steps = [
    START_CHECKIN_STEP_IDS.TIPS,
    START_CHECKIN_STEP_IDS.WEIGHT,
  ]

  if (
    plan?.body_fat_source &&
    plan.body_fat_source !== 'none'
  ) {
    steps.push(
      START_CHECKIN_STEP_IDS.BODY_FAT,
    )
  }

  steps.push(
    START_CHECKIN_STEP_IDS.NECK,
    START_CHECKIN_STEP_IDS.CHEST,
    START_CHECKIN_STEP_IDS.WAIST,
    START_CHECKIN_STEP_IDS.HIPS,
    START_CHECKIN_STEP_IDS.SIDE,
    START_CHECKIN_STEP_IDS.SIDE_MEASUREMENTS,
    START_CHECKIN_STEP_IDS.PHOTO_TIPS,
    START_CHECKIN_STEP_IDS.FRONT_PHOTO,
    START_CHECKIN_STEP_IDS.SIDE_PHOTO,
    START_CHECKIN_STEP_IDS.BACK_PHOTO,
  )

  return steps
}
