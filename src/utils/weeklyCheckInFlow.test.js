import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  DAILY_CHECKIN_STEP_IDS,
} from './dailyCheckInFlow'
import {
  WEEKLY_CHECKIN_STEP_IDS,
  canContinueWeeklyStep,
  fromWeeklyDailyStep,
  getPreviewWeeklyCheckInNumber,
  getWeeklyCheckInNumber,
  getWeeklyCheckInSteps,
  getWeeklyStepMeasurementFields,
  isFullWeeklyMeasurementCheckIn,
  toWeeklyDailyStep,
} from './weeklyCheckInFlow'

const START_DATE = '2026-07-26'
const SUNDAY = 0

const baseForm = {
  weight_status: 'recorded',
  morning_weight: '150',
  meal_plan_score: '5',
  meal_plan_deviation_type: '',
  meal_plan_deviation_details: '',
  hunger_score: '3',
  workout_status: 'rest',
  workout_incomplete_reason: '',
  training_problem: null,
  training_problem_details: '',
  cardio_minutes: '0',
  water_goal_met: false,
  alcohol_consumed: false,
  alcohol_details: '',
  sleep_quality: '3',
  energy_level: '3',
  recovery_score: '3',
  stress_level: '3',
  body_fat_status: '',
  scale_body_fat_percent: '',
  neck_inches: '14',
  chest_inches: '36',
  waist_inches: '32',
  hips_inches: '40',
  bicep_inches: '12',
  thigh_inches: '22',
  calf_inches: '14',
}

const trackingOff = {
  track_water: false,
  track_alcohol: false,
}

describe('Weekly Check-In numbering', () => {
  test('returns 1 on the first scheduled Weekly date', () => {
    expect(
      getWeeklyCheckInNumber(
        START_DATE,
        SUNDAY,
        '2026-08-02',
      ),
    ).toBe(1)
  })

  test('increments by one every seven days', () => {
    expect(
      getWeeklyCheckInNumber(
        START_DATE,
        SUNDAY,
        '2026-08-09',
      ),
    ).toBe(2)

    expect(
      getWeeklyCheckInNumber(
        START_DATE,
        SUNDAY,
        '2026-08-16',
      ),
    ).toBe(3)
  })

  test('returns null before the first Weekly date', () => {
    expect(
      getWeeklyCheckInNumber(
        START_DATE,
        SUNDAY,
        '2026-08-01',
      ),
    ).toBeNull()
  })

  test('returns null on a non-Weekly date', () => {
    expect(
      getWeeklyCheckInNumber(
        START_DATE,
        SUNDAY,
        '2026-08-03',
      ),
    ).toBeNull()
  })

  test('returns null when required dates are missing', () => {
    expect(
      getWeeklyCheckInNumber('', SUNDAY, '2026-08-02'),
    ).toBeNull()

    expect(
      getWeeklyCheckInNumber(START_DATE, SUNDAY, ''),
    ).toBeNull()
  })
})

describe('Weekly preview numbering', () => {
  test('previews Weekly 1 before the first Weekly date', () => {
    expect(
      getPreviewWeeklyCheckInNumber(
        START_DATE,
        SUNDAY,
        '2026-07-30',
      ),
    ).toBe(1)
  })

  test('uses the exact Weekly number on a scheduled Weekly date', () => {
    expect(
      getPreviewWeeklyCheckInNumber(
        START_DATE,
        SUNDAY,
        '2026-08-02',
      ),
    ).toBe(1)
  })

  test('previews the next Weekly number after a scheduled Weekly passes', () => {
    expect(
      getPreviewWeeklyCheckInNumber(
        START_DATE,
        SUNDAY,
        '2026-08-03',
      ),
    ).toBe(2)

    expect(
      getPreviewWeeklyCheckInNumber(
        START_DATE,
        SUNDAY,
        '2026-08-10',
      ),
    ).toBe(3)
  })

  test('returns null when it cannot determine a first Weekly date', () => {
    expect(
      getPreviewWeeklyCheckInNumber(
        '',
        SUNDAY,
        '2026-08-01',
      ),
    ).toBeNull()
  })
})

describe('Full measurement and photo cadence', () => {
  test('uses the default four-week cadence', () => {
    expect(
      isFullWeeklyMeasurementCheckIn({
        weekNumber: 4,
        programLengthWeeks: 12,
      }),
    ).toBe(true)

    expect(
      isFullWeeklyMeasurementCheckIn({
        weekNumber: 8,
        programLengthWeeks: 12,
      }),
    ).toBe(true)
  })

  test('does not require full measurements on ordinary weeks', () => {
    expect(
      isFullWeeklyMeasurementCheckIn({
        weekNumber: 3,
        programLengthWeeks: 12,
      }),
    ).toBe(false)
  })

  test('always makes the final program week a full measurement week', () => {
    expect(
      isFullWeeklyMeasurementCheckIn({
        weekNumber: 10,
        programLengthWeeks: 10,
      }),
    ).toBe(true)
  })

  test('treats a week beyond program length as final/full', () => {
    expect(
      isFullWeeklyMeasurementCheckIn({
        weekNumber: 11,
        programLengthWeeks: 10,
      }),
    ).toBe(true)
  })

  test('supports a custom photo frequency', () => {
    expect(
      isFullWeeklyMeasurementCheckIn({
        weekNumber: 3,
        programLengthWeeks: 12,
        photoFrequencyWeeks: 3,
      }),
    ).toBe(true)
  })

  test.each([null, '', 0, -1, 1.5, 'nope'])(
    'rejects invalid week numbers: %s',
    (weekNumber) => {
      expect(
        isFullWeeklyMeasurementCheckIn({
          weekNumber,
          programLengthWeeks: 12,
        }),
      ).toBe(false)
    },
  )
})

describe('Weekly/Daily step conversion', () => {
  test('wraps and unwraps Daily step ids', () => {
    const weeklyStep = toWeeklyDailyStep(
      DAILY_CHECKIN_STEP_IDS.CARDIO,
    )

    expect(weeklyStep).toBe('daily:cardio')
    expect(fromWeeklyDailyStep(weeklyStep)).toBe('cardio')
  })

  test('returns null for a Weekly-specific step', () => {
    expect(
      fromWeeklyDailyStep(
        WEEKLY_CHECKIN_STEP_IDS.WAIST,
      ),
    ).toBeNull()
  })
})

describe('Weekly step composition', () => {
  test('builds a regular Weekly with waist but no full measurement/photo sequence', () => {
    const steps = getWeeklyCheckInSteps(
      baseForm,
      {
        bodyFatSource: 'none',
        sex: 'male',
        photosRequired: false,
        trackingSettings: trackingOff,
      },
    )

    expect(steps).toEqual([
      WEEKLY_CHECKIN_STEP_IDS.GET_STARTED,
      'daily:weight',
      WEEKLY_CHECKIN_STEP_IDS.WAIST,
      'daily:meal-plan-score',
      'daily:hunger',
      'daily:workout-status',
      'daily:cardio',
      WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
      WEEKLY_CHECKIN_STEP_IDS.REFLECTION,
    ])
  })

  test('adds the scale body-fat step only for scale tracking', () => {
    const scaleSteps = getWeeklyCheckInSteps(
      baseForm,
      {
        bodyFatSource: 'scale',
        sex: 'male',
        photosRequired: false,
        trackingSettings: trackingOff,
      },
    )

    const estimateSteps = getWeeklyCheckInSteps(
      baseForm,
      {
        bodyFatSource: 'juntos_estimate',
        sex: 'male',
        photosRequired: false,
        trackingSettings: trackingOff,
      },
    )

    expect(scaleSteps).toContain(
      WEEKLY_CHECKIN_STEP_IDS.BODY_FAT,
    )
    expect(estimateSteps).not.toContain(
      WEEKLY_CHECKIN_STEP_IDS.BODY_FAT,
    )
  })

  test('adds menstrual context for female users', () => {
    const steps = getWeeklyCheckInSteps(
      baseForm,
      {
        bodyFatSource: 'none',
        sex: 'female',
        photosRequired: false,
        trackingSettings: trackingOff,
      },
    )

    expect(steps).toContain(
      WEEKLY_CHECKIN_STEP_IDS.MENSTRUAL_CONTEXT,
    )
  })

  test('does not add menstrual context for male users', () => {
    const steps = getWeeklyCheckInSteps(
      baseForm,
      {
        bodyFatSource: 'none',
        sex: 'male',
        photosRequired: false,
        trackingSettings: trackingOff,
      },
    )

    expect(steps).not.toContain(
      WEEKLY_CHECKIN_STEP_IDS.MENSTRUAL_CONTEXT,
    )
  })

  test('uses the full measurement and photo sequence when photos are required', () => {
    const steps = getWeeklyCheckInSteps(
      baseForm,
      {
        bodyFatSource: 'none',
        sex: 'male',
        photosRequired: true,
        trackingSettings: trackingOff,
      },
    )

    expect(steps).toEqual([
      WEEKLY_CHECKIN_STEP_IDS.GET_STARTED,
      'daily:weight',
      'daily:meal-plan-score',
      'daily:hunger',
      'daily:workout-status',
      'daily:cardio',
      WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
      WEEKLY_CHECKIN_STEP_IDS.NECK,
      WEEKLY_CHECKIN_STEP_IDS.CHEST,
      WEEKLY_CHECKIN_STEP_IDS.WAIST,
      WEEKLY_CHECKIN_STEP_IDS.HIPS,
      WEEKLY_CHECKIN_STEP_IDS.SIDE_MEASUREMENTS,
      WEEKLY_CHECKIN_STEP_IDS.PHOTO_TIPS,
      WEEKLY_CHECKIN_STEP_IDS.FRONT_PHOTO,
      WEEKLY_CHECKIN_STEP_IDS.SIDE_PHOTO,
      WEEKLY_CHECKIN_STEP_IDS.BACK_PHOTO,
      WEEKLY_CHECKIN_STEP_IDS.REFLECTION,
    ])
  })

  test('does not duplicate waist on a full measurement week', () => {
    const steps = getWeeklyCheckInSteps(
      baseForm,
      {
        bodyFatSource: 'none',
        sex: 'male',
        photosRequired: true,
        trackingSettings: trackingOff,
      },
    )

    expect(
      steps.filter(
        (step) =>
          step === WEEKLY_CHECKIN_STEP_IDS.WAIST,
      ),
    ).toHaveLength(1)
  })

  test('removes Daily coach notes because Weekly ends with reflection instead', () => {
    const steps = getWeeklyCheckInSteps(
      baseForm,
      {
        bodyFatSource: 'none',
        sex: 'male',
        photosRequired: false,
        trackingSettings: trackingOff,
      },
    )

    expect(steps).not.toContain('daily:coach-notes')
    expect(steps.at(-1)).toBe(
      WEEKLY_CHECKIN_STEP_IDS.REFLECTION,
    )
  })
})

describe('Weekly measurement-field mapping', () => {
  test.each([
    [WEEKLY_CHECKIN_STEP_IDS.WAIST, ['waist_inches']],
    [WEEKLY_CHECKIN_STEP_IDS.NECK, ['neck_inches']],
    [WEEKLY_CHECKIN_STEP_IDS.CHEST, ['chest_inches']],
    [WEEKLY_CHECKIN_STEP_IDS.HIPS, ['hips_inches']],
  ])(
    'maps %s to its measurement field',
    (step, expected) => {
      expect(
        getWeeklyStepMeasurementFields(step),
      ).toEqual(expected)
    },
  )

  test('maps side measurements to bicep, thigh, and calf', () => {
    expect(
      getWeeklyStepMeasurementFields(
        WEEKLY_CHECKIN_STEP_IDS.SIDE_MEASUREMENTS,
      ),
    ).toEqual([
      'bicep_inches',
      'thigh_inches',
      'calf_inches',
    ])
  })

  test('returns no measurement fields for non-measurement steps', () => {
    expect(
      getWeeklyStepMeasurementFields(
        WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
      ),
    ).toEqual([])
  })
})

describe('Weekly step continuation', () => {
  test('delegates Weekly Daily steps to Daily validation', () => {
    expect(
      canContinueWeeklyStep(
        'daily:cardio',
        {
          ...baseForm,
          cardio_minutes: '0',
        },
      ),
    ).toBe(true)
  })

  test('requires all four recovery scores to be 1 through 5', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
        baseForm,
      ),
    ).toBe(true)

    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
        {
          ...baseForm,
          stress_level: '6',
        },
      ),
    ).toBe(false)
  })

  test('uses supplied measurement validation for chest', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.CHEST,
        baseForm,
        {
          validationByField: {
            chest_inches: {
              status: 'invalid',
              message: 'bad chest',
            },
          },
        },
      ),
    ).toBe(false)

    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.CHEST,
        baseForm,
        {
          validationByField: {
            chest_inches: {
              status: 'valid',
              message: '',
            },
          },
        },
      ),
    ).toBe(true)
  })

  test('requires every side measurement validation to pass', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.SIDE_MEASUREMENTS,
        baseForm,
        {
          validationByField: {
            bicep_inches: { status: 'valid' },
            thigh_inches: { status: 'valid' },
            calf_inches: { status: 'invalid' },
          },
        },
      ),
    ).toBe(false)
  })

  test('falls back to positive numbers when no measurement validation is supplied', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.WAIST,
        {
          ...baseForm,
          waist_inches: '32',
        },
      ),
    ).toBe(true)

    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.WAIST,
        {
          ...baseForm,
          waist_inches: '0',
        },
      ),
    ).toBe(false)
  })

  test('requires a scale body-fat status', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.BODY_FAT,
        {
          ...baseForm,
          body_fat_status: '',
        },
        {
          bodyFatSource: 'scale',
        },
      ),
    ).toBe(false)
  })

  test('allows a scale user to continue with no reading', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.BODY_FAT,
        {
          ...baseForm,
          body_fat_status: 'no_reading',
        },
        {
          bodyFatSource: 'scale',
        },
      ),
    ).toBe(true)
  })

  test('requires a valid recorded scale body-fat value when validation is supplied', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.BODY_FAT,
        {
          ...baseForm,
          body_fat_status: 'recorded',
          scale_body_fat_percent: '30',
        },
        {
          bodyFatSource: 'scale',
          validationByField: {
            scale_body_fat_percent: {
              status: 'invalid',
            },
          },
        },
      ),
    ).toBe(false)

    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.BODY_FAT,
        {
          ...baseForm,
          body_fat_status: 'recorded',
          scale_body_fat_percent: '30',
        },
        {
          bodyFatSource: 'scale',
          validationByField: {
            scale_body_fat_percent: {
              status: 'valid',
            },
          },
        },
      ),
    ).toBe(true)
  })

  test('does not require a manual body-fat answer for Juntos estimate mode', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.BODY_FAT,
        baseForm,
        {
          bodyFatSource: 'juntos_estimate',
        },
      ),
    ).toBe(true)
  })

  test('requires persisted progress photos when photos are required', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.FRONT_PHOTO,
        baseForm,
        {
          photosRequired: true,
          previewMode: false,
          photos: {
            front: null,
          },
        },
      ),
    ).toBe(false)

    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.FRONT_PHOTO,
        baseForm,
        {
          photosRequired: true,
          previewMode: false,
          photos: {
            front: { id: 'photo-1' },
          },
        },
      ),
    ).toBe(true)
  })

  test('does not block photo steps in preview mode', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.SIDE_PHOTO,
        baseForm,
        {
          photosRequired: true,
          previewMode: true,
          photos: {
            side: null,
          },
        },
      ),
    ).toBe(true)
  })

  test('does not require a photo on non-photo weeks', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.BACK_PHOTO,
        baseForm,
        {
          photosRequired: false,
          previewMode: false,
          photos: {
            back: null,
          },
        },
      ),
    ).toBe(true)
  })

  test('treats informational and optional Weekly steps as continuable', () => {
    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.PHOTO_TIPS,
        baseForm,
      ),
    ).toBe(true)

    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.MENSTRUAL_CONTEXT,
        baseForm,
      ),
    ).toBe(true)

    expect(
      canContinueWeeklyStep(
        WEEKLY_CHECKIN_STEP_IDS.REFLECTION,
        baseForm,
      ),
    ).toBe(true)
  })
})
