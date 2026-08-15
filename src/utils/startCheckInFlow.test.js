import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  SIDE_OPTIONS,
  START_CHECKIN_STEP_IDS,
  getStartCheckInSteps,
} from './startCheckInFlow'

describe('Start Check-In step composition', () => {
  test('builds the full Start Check-In path when body fat is not tracked', () => {
    expect(
      getStartCheckInSteps({
        body_fat_source: 'none',
      }),
    ).toEqual([
      START_CHECKIN_STEP_IDS.TIPS,
      START_CHECKIN_STEP_IDS.WEIGHT,
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
    ])
  })

  test('adds the body-fat step for scale tracking', () => {
    const steps = getStartCheckInSteps({
      body_fat_source: 'scale',
    })

    expect(steps).toContain(
      START_CHECKIN_STEP_IDS.BODY_FAT,
    )
    expect(
      steps.indexOf(
        START_CHECKIN_STEP_IDS.BODY_FAT,
      ),
    ).toBe(
      steps.indexOf(
        START_CHECKIN_STEP_IDS.WEIGHT,
      ) + 1,
    )
  })

  test('adds the body-fat step for Juntos estimate mode under the current flow rules', () => {
    const steps = getStartCheckInSteps({
      body_fat_source: 'juntos_estimate',
    })

    expect(steps).toContain(
      START_CHECKIN_STEP_IDS.BODY_FAT,
    )
  })

  test('omits the body-fat step when the source is missing', () => {
    const steps = getStartCheckInSteps({})

    expect(steps).not.toContain(
      START_CHECKIN_STEP_IDS.BODY_FAT,
    )
  })

  test('also works when no plan is supplied', () => {
    const steps = getStartCheckInSteps()

    expect(steps).not.toContain(
      START_CHECKIN_STEP_IDS.BODY_FAT,
    )
    expect(steps[0]).toBe(
      START_CHECKIN_STEP_IDS.TIPS,
    )
    expect(steps.at(-1)).toBe(
      START_CHECKIN_STEP_IDS.BACK_PHOTO,
    )
  })

  test('keeps the measurement steps in their intended order', () => {
    const steps = getStartCheckInSteps({
      body_fat_source: 'none',
    })

    const measurementSequence = [
      START_CHECKIN_STEP_IDS.NECK,
      START_CHECKIN_STEP_IDS.CHEST,
      START_CHECKIN_STEP_IDS.WAIST,
      START_CHECKIN_STEP_IDS.HIPS,
      START_CHECKIN_STEP_IDS.SIDE,
      START_CHECKIN_STEP_IDS.SIDE_MEASUREMENTS,
    ]

    const indexes = measurementSequence.map(
      (step) => steps.indexOf(step),
    )

    expect(indexes).toEqual(
      [...indexes].sort((a, b) => a - b),
    )
  })

  test('always includes all three required progress-photo poses', () => {
    const steps = getStartCheckInSteps({
      body_fat_source: 'none',
    })

    expect(steps).toContain(
      START_CHECKIN_STEP_IDS.FRONT_PHOTO,
    )
    expect(steps).toContain(
      START_CHECKIN_STEP_IDS.SIDE_PHOTO,
    )
    expect(steps).toContain(
      START_CHECKIN_STEP_IDS.BACK_PHOTO,
    )
  })

  test('places photo tips immediately before the three photo steps', () => {
    const steps = getStartCheckInSteps({
      body_fat_source: 'scale',
    })

    const photoTipsIndex = steps.indexOf(
      START_CHECKIN_STEP_IDS.PHOTO_TIPS,
    )

    expect(
      steps.slice(
        photoTipsIndex,
        photoTipsIndex + 4,
      ),
    ).toEqual([
      START_CHECKIN_STEP_IDS.PHOTO_TIPS,
      START_CHECKIN_STEP_IDS.FRONT_PHOTO,
      START_CHECKIN_STEP_IDS.SIDE_PHOTO,
      START_CHECKIN_STEP_IDS.BACK_PHOTO,
    ])
  })
})

describe('Start Check-In side options', () => {
  test('offers exactly left and right measurement sides', () => {
    expect(SIDE_OPTIONS).toEqual([
      {
        value: 'left',
        label: 'Left side',
      },
      {
        value: 'right',
        label: 'Right side',
      },
    ])
  })
})
