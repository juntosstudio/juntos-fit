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
  FRONT_PHOTO: 'front-photo',
  SIDE_PHOTO: 'side-photo',
  BACK_PHOTO: 'back-photo',
}

const BASE_STEPS = [
  START_CHECKIN_STEP_IDS.TIPS,
  START_CHECKIN_STEP_IDS.WEIGHT,
  START_CHECKIN_STEP_IDS.BODY_FAT,
  START_CHECKIN_STEP_IDS.NECK,
  START_CHECKIN_STEP_IDS.CHEST,
  START_CHECKIN_STEP_IDS.WAIST,
  START_CHECKIN_STEP_IDS.HIPS,
  START_CHECKIN_STEP_IDS.SIDE,
  START_CHECKIN_STEP_IDS.SIDE_MEASUREMENTS,
  START_CHECKIN_STEP_IDS.FRONT_PHOTO,
  START_CHECKIN_STEP_IDS.SIDE_PHOTO,
  START_CHECKIN_STEP_IDS.BACK_PHOTO,
]

export const SIDE_OPTIONS = [
  { value: 'left', label: 'Left Side' },
  { value: 'right', label: 'Right Side' },
]

// Removes the body-fat question when the plan does not track it.
export function getStartCheckInSteps(plan) {
  if (plan?.body_fat_source === 'none') {
    return BASE_STEPS.filter(
      (step) =>
        step !==
        START_CHECKIN_STEP_IDS.BODY_FAT,
    )
  }

  return [...BASE_STEPS]
}
