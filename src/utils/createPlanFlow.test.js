import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  BODY_FAT_SOURCE_OPTIONS,
  CREATE_PLAN_STEP_IDS,
  CREATE_PLAN_STEPS,
  GOAL_OPTIONS,
  NUTRITION_TARGET_METHOD_OPTIONS,
  WEEKDAY_OPTIONS,
  getDateKeyWeekday,
  validateCreatePlan,
  validateCreatePlanStep,
} from './createPlanFlow'

const TODAY = '2026-08-15'

const validForm = {
  goal: 'fat_loss',
  unit_system: 'imperial',
  body_fat_source: 'none',
  track_water: false,
  track_alcohol: false,
  start_date: TODAY,
  program_length_weeks: '12',
  checkin_day: '0',
  nutrition_target_method: 'macros_known',
  calorie_target: '1700',
  protein_grams: '165',
  carb_grams: '125',
  fat_grams: '60',
  weekly_workout_target: '3',
  weekly_cardio_target_minutes: '90',
  daily_water_goal_oz: '',
}

describe('Create Plan step order and options', () => {
  test('keeps the Create Plan wizard in the intended order', () => {
    expect(CREATE_PLAN_STEPS).toEqual([
      CREATE_PLAN_STEP_IDS.GOAL,
      CREATE_PLAN_STEP_IDS.UNIT_SYSTEM,
      CREATE_PLAN_STEP_IDS.BODY_FAT_SOURCE,
      CREATE_PLAN_STEP_IDS.CHECKIN_TRACKING,
      CREATE_PLAN_STEP_IDS.START_DATE,
      CREATE_PLAN_STEP_IDS.LENGTH,
      CREATE_PLAN_STEP_IDS.CHECKIN_DAY,
      CREATE_PLAN_STEP_IDS.NUTRITION_METHOD,
      CREATE_PLAN_STEP_IDS.NUTRITION,
      CREATE_PLAN_STEP_IDS.ACTIVITY,
    ])
  })

  test('offers the three coaching goals', () => {
    expect(
      GOAL_OPTIONS.map((option) => option.value),
    ).toEqual([
      'fat_loss',
      'maintenance',
      'muscle_gain',
    ])
  })

  test('offers scale, Juntos estimate, and no body-fat tracking', () => {
    expect(
      BODY_FAT_SOURCE_OPTIONS.map(
        (option) => option.value,
      ),
    ).toEqual([
      'scale',
      'juntos_estimate',
      'none',
    ])
  })

  test('offers Sunday through Saturday with values 0 through 6', () => {
    expect(
      WEEKDAY_OPTIONS.map(
        (option) => option.value,
      ),
    ).toEqual([0, 1, 2, 3, 4, 5, 6])

    expect(
      WEEKDAY_OPTIONS.map(
        (option) => option.label,
      ),
    ).toEqual([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ])
  })

  test('currently enables only the known-macros nutrition method', () => {
    expect(
      NUTRITION_TARGET_METHOD_OPTIONS.map(
        ({ value, disabled }) => ({
          value,
          disabled,
        }),
      ),
    ).toEqual([
      {
        value: 'macros_known',
        disabled: false,
      },
      {
        value: 'calories_known',
        disabled: true,
      },
      {
        value: 'calculate_for_me',
        disabled: true,
      },
    ])
  })
})

describe('Create Plan weekday helper', () => {
  test('returns Sunday as 0 and Saturday as 6', () => {
    expect(
      getDateKeyWeekday('2026-07-26'),
    ).toBe(0)

    expect(
      getDateKeyWeekday('2026-08-01'),
    ).toBe(6)
  })

  test('returns null when the date key is missing', () => {
    expect(getDateKeyWeekday('')).toBeNull()
    expect(getDateKeyWeekday(null)).toBeNull()
  })
})

describe('Goal validation', () => {
  test('accepts a chosen goal', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.GOAL,
        validForm,
        TODAY,
      ),
    ).toBe('')
  })

  test('requires a goal', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.GOAL,
        {
          ...validForm,
          goal: '',
        },
        TODAY,
      ),
    ).toBe('Choose your coaching goal.')
  })
})

describe('Unit-system validation', () => {
  test.each(['imperial', 'metric'])(
    'accepts %s units',
    (unit_system) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.UNIT_SYSTEM,
          {
            ...validForm,
            unit_system,
          },
          TODAY,
        ),
      ).toBe('')
    },
  )

  test('rejects an unsupported unit system', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.UNIT_SYSTEM,
        {
          ...validForm,
          unit_system: 'stones',
        },
        TODAY,
      ),
    ).toBe('Choose your measurement units.')
  })
})

describe('Body-fat tracking validation', () => {
  test.each([
    'scale',
    'juntos_estimate',
    'none',
  ])(
    'accepts body-fat source %s',
    (body_fat_source) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.BODY_FAT_SOURCE,
          {
            ...validForm,
            body_fat_source,
          },
          TODAY,
        ),
      ).toBe('')
    },
  )

  test('rejects an unsupported body-fat source', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.BODY_FAT_SOURCE,
        {
          ...validForm,
          body_fat_source: '',
        },
        TODAY,
      ),
    ).toBe(
      'Choose how body fat will be tracked.',
    )
  })
})

describe('Check-In tracking validation', () => {
  test.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])(
    'accepts explicit boolean tracking choices: water=%s alcohol=%s',
    (track_water, track_alcohol) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.CHECKIN_TRACKING,
          {
            ...validForm,
            track_water,
            track_alcohol,
          },
          TODAY,
        ),
      ).toBe('')
    },
  )

  test('requires explicit water and alcohol choices', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.CHECKIN_TRACKING,
        {
          ...validForm,
          track_water: null,
        },
        TODAY,
      ),
    ).toBe(
      'Choose whether to track water and alcohol.',
    )
  })
})

describe('Start-date validation', () => {
  test('accepts today as the plan start date', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.START_DATE,
        validForm,
        TODAY,
      ),
    ).toBe('')
  })

  test('accepts a future plan start date', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.START_DATE,
        {
          ...validForm,
          start_date: '2026-08-16',
        },
        TODAY,
      ),
    ).toBe('')
  })

  test('requires a start date', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.START_DATE,
        {
          ...validForm,
          start_date: '',
        },
        TODAY,
      ),
    ).toBe('Choose your plan start date.')
  })

  test('rejects a start date in the past', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.START_DATE,
        {
          ...validForm,
          start_date: '2026-08-14',
        },
        TODAY,
      ),
    ).toBe(
      'Your plan start date cannot be in the past.',
    )
  })
})

describe('Program-length validation', () => {
  test.each(['1', '12', '52'])(
    'accepts valid whole-number length %s',
    (program_length_weeks) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.LENGTH,
          {
            ...validForm,
            program_length_weeks,
          },
          TODAY,
        ),
      ).toBe('')
    },
  )

  test.each(['', '0', '53', '12.5', 'abc'])(
    'rejects invalid program length %s',
    (program_length_weeks) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.LENGTH,
          {
            ...validForm,
            program_length_weeks,
          },
          TODAY,
        ),
      ).toBe(
        'Program length must be between 1 and 52 weeks.',
      )
    },
  )
})

describe('Check-In weekday validation', () => {
  test.each(['0', '3', '6'])(
    'accepts weekday %s',
    (checkin_day) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.CHECKIN_DAY,
          {
            ...validForm,
            checkin_day,
          },
          TODAY,
        ),
      ).toBe('')
    },
  )

  test.each(['', '-1', '7', '1.5', 'Sunday'])(
    'rejects invalid weekday %s',
    (checkin_day) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.CHECKIN_DAY,
          {
            ...validForm,
            checkin_day,
          },
          TODAY,
        ),
      ).toBe(
        'Choose your weekly check-in day.',
      )
    },
  )
})

describe('Nutrition-method validation', () => {
  test('accepts the currently enabled macros-known method', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.NUTRITION_METHOD,
        validForm,
        TODAY,
      ),
    ).toBe('')
  })

  test.each([
    '',
    'calories_known',
    'calculate_for_me',
  ])(
    'rejects unavailable nutrition method %s',
    (nutrition_target_method) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.NUTRITION_METHOD,
          {
            ...validForm,
            nutrition_target_method,
          },
          TODAY,
        ),
      ).toBe(
        'Choose how you want to set your nutrition targets.',
      )
    },
  )
})

describe('Nutrition-target validation', () => {
  test('accepts valid whole-number calories and macros', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.NUTRITION,
        validForm,
        TODAY,
      ),
    ).toBe('')
  })

  test.each(['', '0', '10001', '1700.5', 'abc'])(
    'rejects invalid calorie target %s',
    (calorie_target) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.NUTRITION,
          {
            ...validForm,
            calorie_target,
          },
          TODAY,
        ),
      ).toBe(
        'Enter a valid daily calorie target.',
      )
    },
  )

  test('allows zero grams for an individual macro', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.NUTRITION,
        {
          ...validForm,
          carb_grams: '0',
        },
        TODAY,
      ),
    ).toBe('')
  })

  test.each([
    ['protein_grams', '-1'],
    ['protein_grams', '1001'],
    ['protein_grams', '100.5'],
    ['carb_grams', 'abc'],
    ['fat_grams', ''],
  ])(
    'rejects invalid macro %s=%s',
    (field, value) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.NUTRITION,
          {
            ...validForm,
            [field]: value,
          },
          TODAY,
        ),
      ).toBe(
        'Enter valid protein, carbohydrate, and fat targets.',
      )
    },
  )
})

describe('Activity validation', () => {
  test('accepts zero workouts and zero cardio', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.ACTIVITY,
        {
          ...validForm,
          weekly_workout_target: '0',
          weekly_cardio_target_minutes: '0',
        },
        TODAY,
      ),
    ).toBe('')
  })

  test('accepts the maximum workout and cardio targets', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.ACTIVITY,
        {
          ...validForm,
          weekly_workout_target: '14',
          weekly_cardio_target_minutes: '3000',
        },
        TODAY,
      ),
    ).toBe('')
  })

  test.each(['-1', '15', '3.5', 'abc', ''])(
    'rejects invalid weekly workout target %s',
    (weekly_workout_target) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.ACTIVITY,
          {
            ...validForm,
            weekly_workout_target,
          },
          TODAY,
        ),
      ).toBe(
        'Weekly workouts must be between 0 and 14.',
      )
    },
  )

  test.each(['-1', '3001', '90.5', 'abc', ''])(
    'rejects invalid weekly cardio target %s',
    (weekly_cardio_target_minutes) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.ACTIVITY,
          {
            ...validForm,
            weekly_cardio_target_minutes,
          },
          TODAY,
        ),
      ).toBe(
        'Weekly cardio must be between 0 and 3,000 minutes.',
      )
    },
  )

  test('does not require a water goal when water tracking is off', () => {
    expect(
      validateCreatePlanStep(
        CREATE_PLAN_STEP_IDS.ACTIVITY,
        {
          ...validForm,
          track_water: false,
          daily_water_goal_oz: '',
        },
        TODAY,
      ),
    ).toBe('')
  })

  test.each(['1', '64', '500'])(
    'accepts water goal %s when water tracking is on',
    (daily_water_goal_oz) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.ACTIVITY,
          {
            ...validForm,
            track_water: true,
            daily_water_goal_oz,
          },
          TODAY,
        ),
      ).toBe('')
    },
  )

  test.each(['', '0', '501', '64.5', 'abc'])(
    'rejects invalid water goal %s when water tracking is on',
    (daily_water_goal_oz) => {
      expect(
        validateCreatePlanStep(
          CREATE_PLAN_STEP_IDS.ACTIVITY,
          {
            ...validForm,
            track_water: true,
            daily_water_goal_oz,
          },
          TODAY,
        ),
      ).toBe(
        'Daily water must be between 1 and 500 ounces.',
      )
    },
  )
})

describe('Whole-plan validation', () => {
  test('returns no error for a completely valid plan', () => {
    expect(
      validateCreatePlan(validForm, TODAY),
    ).toEqual({
      error: '',
      step: null,
    })
  })

  test('returns the first invalid step in wizard order', () => {
    expect(
      validateCreatePlan(
        {
          ...validForm,
          goal: '',
          start_date: '',
          calorie_target: '',
        },
        TODAY,
      ),
    ).toEqual({
      error: 'Choose your coaching goal.',
      step: CREATE_PLAN_STEP_IDS.GOAL,
    })
  })

  test('returns the later failing step after earlier steps are valid', () => {
    expect(
      validateCreatePlan(
        {
          ...validForm,
          calorie_target: '',
        },
        TODAY,
      ),
    ).toEqual({
      error:
        'Enter a valid daily calorie target.',
      step: CREATE_PLAN_STEP_IDS.NUTRITION,
    })
  })

  test('ignores unknown step ids in single-step validation', () => {
    expect(
      validateCreatePlanStep(
        'not-a-real-step',
        validForm,
        TODAY,
      ),
    ).toBe('')
  })
})
