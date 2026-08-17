import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  DAILY_CHECKIN_STEP_IDS,
  MEAL_PLAN_DEVIATION_TYPES,
  canContinueDailyStep,
  getDailyCheckInSteps,
  getDailyCheckInValidationError,
  getFirstInvalidDailyStep,
} from './dailyCheckInFlow'

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
  cardio_type: '',
  cardio_intensity: '',
  water_goal_met: null,
  alcohol_consumed: null,
  alcohol_details: '',
}

const trackingOff = {
  track_water: false,
  track_alcohol: false,
}

const trackingOn = {
  track_water: true,
  track_alcohol: true,
}

describe('Daily Check-In step composition', () => {
  test('builds the basic Daily flow when optional tracking is off', () => {
    expect(
      getDailyCheckInSteps(baseForm, trackingOff),
    ).toEqual([
      DAILY_CHECKIN_STEP_IDS.WEIGHT,
      DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_SCORE,
      DAILY_CHECKIN_STEP_IDS.HUNGER,
      DAILY_CHECKIN_STEP_IDS.WORKOUT_STATUS,
      DAILY_CHECKIN_STEP_IDS.CARDIO,
      DAILY_CHECKIN_STEP_IDS.COACH_NOTES,
    ])
  })

  test.each(['1', '2', '3', '4'])(
    'adds the deviation-type question when meal score is %s',
    (mealPlanScore) => {
      const steps = getDailyCheckInSteps(
        {
          ...baseForm,
          meal_plan_score: mealPlanScore,
        },
        trackingOff,
      )

      expect(steps).toContain(
        DAILY_CHECKIN_STEP_IDS.CHEAT_MEAL,
      )
    },
  )

  test('does not add deviation questions for a perfect meal-plan score', () => {
    const steps = getDailyCheckInSteps(
      {
        ...baseForm,
        meal_plan_score: '5',
      },
      trackingOff,
    )

    expect(steps).not.toContain(
      DAILY_CHECKIN_STEP_IDS.CHEAT_MEAL,
    )
    expect(steps).not.toContain(
      DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_DEVIATION,
    )
  })

  test.each([
    MEAL_PLAN_DEVIATION_TYPES.CHEAT_PLUS,
    MEAL_PLAN_DEVIATION_TYPES.NO_CHEAT,
  ])(
    'adds deviation details for %s',
    (meal_plan_deviation_type) => {
      const steps = getDailyCheckInSteps(
        {
          ...baseForm,
          meal_plan_score: '3',
          meal_plan_deviation_type,
        },
        trackingOff,
      )

      expect(steps).toContain(
        DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_DEVIATION,
      )
    },
  )

  test('does not require extra deviation details for cheat-only', () => {
    const steps = getDailyCheckInSteps(
      {
        ...baseForm,
        meal_plan_score: '3',
        meal_plan_deviation_type:
          MEAL_PLAN_DEVIATION_TYPES.CHEAT_ONLY,
      },
      trackingOff,
    )

    expect(steps).not.toContain(
      DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_DEVIATION,
    )
  })

  test('adds incomplete-reason when workout was missed', () => {
    const steps = getDailyCheckInSteps(
      {
        ...baseForm,
        workout_status: 'missed',
      },
      trackingOff,
    )

    expect(steps).toContain(
      DAILY_CHECKIN_STEP_IDS.WORKOUT_INCOMPLETE_REASON,
    )
    expect(steps).not.toContain(
      DAILY_CHECKIN_STEP_IDS.TRAINING_PROBLEM,
    )
  })

  test.each(['completed', 'partial'])(
    'adds training-problem question for an attempted workout: %s',
    (workout_status) => {
      const steps = getDailyCheckInSteps(
        {
          ...baseForm,
          workout_status,
        },
        trackingOff,
      )

      expect(steps).toContain(
        DAILY_CHECKIN_STEP_IDS.TRAINING_PROBLEM,
      )
    },
  )

  test('adds training-problem details only when a problem was reported', () => {
    const steps = getDailyCheckInSteps(
      {
        ...baseForm,
        workout_status: 'completed',
        training_problem: true,
      },
      trackingOff,
    )

    expect(steps).toContain(
      DAILY_CHECKIN_STEP_IDS.TRAINING_PROBLEM_DETAILS,
    )
  })

  test('adds water and alcohol only when tracking is enabled', () => {
    const onSteps = getDailyCheckInSteps(
      baseForm,
      trackingOn,
    )
    const offSteps = getDailyCheckInSteps(
      baseForm,
      trackingOff,
    )

    expect(onSteps).toContain(
      DAILY_CHECKIN_STEP_IDS.WATER,
    )
    expect(onSteps).toContain(
      DAILY_CHECKIN_STEP_IDS.ALCOHOL,
    )

    expect(offSteps).not.toContain(
      DAILY_CHECKIN_STEP_IDS.WATER,
    )
    expect(offSteps).not.toContain(
      DAILY_CHECKIN_STEP_IDS.ALCOHOL,
    )
  })

  test('adds alcohol details only when alcohol tracking is on and alcohol was consumed', () => {
    const steps = getDailyCheckInSteps(
      {
        ...baseForm,
        alcohol_consumed: true,
      },
      trackingOn,
    )

    expect(steps).toContain(
      DAILY_CHECKIN_STEP_IDS.ALCOHOL_DETAILS,
    )

    const trackingOffSteps =
      getDailyCheckInSteps(
        {
          ...baseForm,
          alcohol_consumed: true,
        },
        trackingOff,
      )

    expect(trackingOffSteps).not.toContain(
      DAILY_CHECKIN_STEP_IDS.ALCOHOL_DETAILS,
    )
  })

  test('always leaves coach notes as the final step', () => {
    const steps = getDailyCheckInSteps(
      {
        ...baseForm,
        meal_plan_score: '3',
        meal_plan_deviation_type:
          MEAL_PLAN_DEVIATION_TYPES.CHEAT_PLUS,
        workout_status: 'completed',
        training_problem: true,
        alcohol_consumed: true,
      },
      trackingOn,
    )

    expect(steps.at(-1)).toBe(
      DAILY_CHECKIN_STEP_IDS.COACH_NOTES,
    )
  })
})

describe('Daily step continuation', () => {
  test('requires a weight status', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WEIGHT,
        {
          ...baseForm,
          weight_status: '',
        },
      ),
    ).toBe(false)
  })

  test('allows a non-recorded weight status without a number', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WEIGHT,
        {
          ...baseForm,
          weight_status: 'no_scale',
          morning_weight: '',
        },
      ),
    ).toBe(true)
  })

  test('requires a positive recorded weight without supplied validation', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WEIGHT,
        {
          ...baseForm,
          morning_weight: '0',
        },
      ),
    ).toBe(false)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WEIGHT,
        baseForm,
      ),
    ).toBe(true)
  })

  test('uses supplied morning-weight validation when available', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WEIGHT,
        baseForm,
        {
          validationByField: {
            morning_weight: {
              status: 'invalid',
            },
          },
        },
      ),
    ).toBe(false)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WEIGHT,
        baseForm,
        {
          validationByField: {
            morning_weight: {
              status: 'valid',
            },
          },
        },
      ),
    ).toBe(true)
  })

  test.each(['1', '2', '3', '4', '5'])(
    'accepts valid meal-plan score %s',
    (meal_plan_score) => {
      expect(
        canContinueDailyStep(
          DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_SCORE,
          {
            ...baseForm,
            meal_plan_score,
          },
        ),
      ).toBe(true)
    },
  )

  test.each(['', '0', '6', '2.5'])(
    'rejects invalid meal-plan score %s',
    (meal_plan_score) => {
      expect(
        canContinueDailyStep(
          DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_SCORE,
          {
            ...baseForm,
            meal_plan_score,
          },
        ),
      ).toBe(false)
    },
  )

  test.each([
    MEAL_PLAN_DEVIATION_TYPES.CHEAT_ONLY,
    MEAL_PLAN_DEVIATION_TYPES.CHEAT_PLUS,
    MEAL_PLAN_DEVIATION_TYPES.NO_CHEAT,
  ])(
    'accepts valid deviation type %s',
    (meal_plan_deviation_type) => {
      expect(
        canContinueDailyStep(
          DAILY_CHECKIN_STEP_IDS.CHEAT_MEAL,
          {
            ...baseForm,
            meal_plan_deviation_type,
          },
        ),
      ).toBe(true)
    },
  )

  test('requires non-blank deviation details', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_DEVIATION,
        {
          ...baseForm,
          meal_plan_deviation_details: '   ',
        },
      ),
    ).toBe(false)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.MEAL_PLAN_DEVIATION,
        {
          ...baseForm,
          meal_plan_deviation_details:
            'Ate fries with lunch',
        },
      ),
    ).toBe(true)
  })

  test('requires hunger score from 1 through 5', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.HUNGER,
        {
          ...baseForm,
          hunger_score: '5',
        },
      ),
    ).toBe(true)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.HUNGER,
        {
          ...baseForm,
          hunger_score: '6',
        },
      ),
    ).toBe(false)
  })

  test('requires workout status', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WORKOUT_STATUS,
        {
          ...baseForm,
          workout_status: '',
        },
      ),
    ).toBe(false)
  })

  test('requires a non-blank incomplete-workout reason', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WORKOUT_INCOMPLETE_REASON,
        {
          ...baseForm,
          workout_incomplete_reason: ' ',
        },
      ),
    ).toBe(false)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WORKOUT_INCOMPLETE_REASON,
        {
          ...baseForm,
          workout_incomplete_reason: 'Sick',
        },
      ),
    ).toBe(true)
  })

  test('requires training-problem answer but accepts false', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.TRAINING_PROBLEM,
        {
          ...baseForm,
          training_problem: null,
        },
      ),
    ).toBe(false)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.TRAINING_PROBLEM,
        {
          ...baseForm,
          training_problem: false,
        },
      ),
    ).toBe(true)
  })

  test('requires non-blank training-problem details', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.TRAINING_PROBLEM_DETAILS,
        {
          ...baseForm,
          training_problem_details: ' ',
        },
      ),
    ).toBe(false)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.TRAINING_PROBLEM_DETAILS,
        {
          ...baseForm,
          training_problem_details:
            'Right shoulder hurt',
        },
      ),
    ).toBe(true)
  })

  test('accepts zero cardio minutes', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.CARDIO,
        {
          ...baseForm,
          cardio_minutes: '0',
        },
      ),
    ).toBe(true)
  })

  test('requires cardio type and effort when cardio minutes are greater than zero', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.CARDIO,
        {
          ...baseForm,
          cardio_minutes: '20',
        },
      ),
    ).toBe(false)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.CARDIO,
        {
          ...baseForm,
          cardio_minutes: '20',
          cardio_type: 'walking',
          cardio_intensity: 'moderate',
        },
      ),
    ).toBe(true)
  })

  test('allows legacy saved cardio without context so old Dailies remain editable', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.CARDIO,
        {
          ...baseForm,
          cardio_minutes: '20',
          _allow_legacy_cardio_context:
            true,
        },
      ),
    ).toBe(true)
  })

  test('rejects invalid cardio input', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.CARDIO,
        {
          ...baseForm,
          cardio_minutes: '1.5',
        },
      ),
    ).toBe(false)
  })

  test('uses supplied cardio validation when available', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.CARDIO,
        baseForm,
        {
          validationByField: {
            cardio_minutes: {
              status: 'invalid',
            },
          },
        },
      ),
    ).toBe(false)
  })

  test('requires an explicit water answer', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WATER,
        {
          ...baseForm,
          water_goal_met: null,
        },
      ),
    ).toBe(false)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.WATER,
        {
          ...baseForm,
          water_goal_met: false,
        },
      ),
    ).toBe(true)
  })

  test('requires an explicit alcohol answer', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.ALCOHOL,
        {
          ...baseForm,
          alcohol_consumed: null,
        },
      ),
    ).toBe(false)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.ALCOHOL,
        {
          ...baseForm,
          alcohol_consumed: false,
        },
      ),
    ).toBe(true)
  })

  test('requires non-blank alcohol details', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.ALCOHOL_DETAILS,
        {
          ...baseForm,
          alcohol_details: ' ',
        },
      ),
    ).toBe(false)

    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.ALCOHOL_DETAILS,
        {
          ...baseForm,
          alcohol_details: '2 glasses of wine',
        },
      ),
    ).toBe(true)
  })

  test('treats coach notes as optional', () => {
    expect(
      canContinueDailyStep(
        DAILY_CHECKIN_STEP_IDS.COACH_NOTES,
        baseForm,
      ),
    ).toBe(true)
  })
})

describe('First invalid Daily step', () => {
  test('returns the first invalid step in flow order', () => {
    expect(
      getFirstInvalidDailyStep(
        {
          ...baseForm,
          weight_status: '',
          meal_plan_score: '',
        },
        {
          trackingSettings: trackingOff,
        },
      ),
    ).toBe(DAILY_CHECKIN_STEP_IDS.WEIGHT)
  })

  test('returns null when all required active steps are complete', () => {
    expect(
      getFirstInvalidDailyStep(
        baseForm,
        {
          trackingSettings: trackingOff,
        },
      ),
    ).toBeNull()
  })

  test('ignores disabled water and alcohol tracking', () => {
    expect(
      getFirstInvalidDailyStep(
        {
          ...baseForm,
          water_goal_met: null,
          alcohol_consumed: null,
        },
        {
          trackingSettings: trackingOff,
        },
      ),
    ).toBeNull()
  })
})

describe('Daily validation error messages', () => {
  test('asks for weight status when it is missing', () => {
    expect(
      getDailyCheckInValidationError(
        {
          ...baseForm,
          weight_status: '',
        },
        {
          trackingSettings: trackingOff,
        },
      ),
    ).toBe(
      'Enter your morning weight or choose why you do not have one today.',
    )
  })

  test('asks for morning weight when recorded status has no value', () => {
    expect(
      getDailyCheckInValidationError(
        {
          ...baseForm,
          weight_status: 'recorded',
          morning_weight: '',
        },
        {
          trackingSettings: trackingOff,
        },
      ),
    ).toBe('Enter your morning weight.')
  })

  test('asks for cardio type before effort when positive cardio has no context', () => {
    expect(
      getDailyCheckInValidationError(
        {
          ...baseForm,
          cardio_minutes: '20',
        },
        {
          trackingSettings: trackingOff,
        },
      ),
    ).toBe(
      'Choose the type of cardio you did.',
    )

    expect(
      getDailyCheckInValidationError(
        {
          ...baseForm,
          cardio_minutes: '20',
          cardio_type: 'walking',
        },
        {
          trackingSettings: trackingOff,
        },
      ),
    ).toBe(
      'Choose how hard the cardio felt.',
    )
  })

  test('returns cardio validation message for invalid cardio', () => {
    expect(
      getDailyCheckInValidationError(
        {
          ...baseForm,
          cardio_minutes: '1.5',
        },
        {
          trackingSettings: trackingOff,
        },
      ),
    ).toBe('Enter cardio minutes as a whole number.')
  })

  test('asks for water only when water tracking is active', () => {
    expect(
      getDailyCheckInValidationError(
        {
          ...baseForm,
          water_goal_met: null,
          alcohol_consumed: false,
        },
        {
          trackingSettings: trackingOn,
        },
      ),
    ).toBe(
      'Choose whether you hit your water goal.',
    )
  })

  test('asks for alcohol details when alcohol was consumed', () => {
    expect(
      getDailyCheckInValidationError(
        {
          ...baseForm,
          water_goal_met: true,
          alcohol_consumed: true,
          alcohol_details: '',
        },
        {
          trackingSettings: trackingOn,
        },
      ),
    ).toBe(
      'Enter what you drank and how much.',
    )
  })

  test('returns no error when all active required answers are valid', () => {
    expect(
      getDailyCheckInValidationError(
        baseForm,
        {
          trackingSettings: trackingOff,
        },
      ),
    ).toBe('')
  })
})
