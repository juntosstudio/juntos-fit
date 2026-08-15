import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  canContinueMeasurementFields,
  getCardioMinutesValidation,
  getCheckInMeasurementValidation,
  getCheckInWarningConfirmationKey,
  getFirstInvalidMeasurementMessage,
  getMeasurementValidation,
  getWarningConfirmationKey,
} from './measurementValidation'

describe('Measurement validation', () => {
  test.each(['', null, undefined])(
    'treats %s as unanswered',
    (value) => {
      expect(getMeasurementValidation({
        field: 'waist_inches',
        value,
        unitSystem: 'imperial',
      })).toEqual({
        status: 'unanswered',
        message: '',
      })
    },
  )

  test('accepts a normal measurement', () => {
    expect(getMeasurementValidation({
      field: 'waist_inches',
      value: '34.0',
      unitSystem: 'imperial',
    })).toEqual({
      status: 'valid',
      message: '',
    })
  })

  test('trims surrounding whitespace before validating', () => {
    expect(getMeasurementValidation({
      field: 'waist_inches',
      value: ' 34.0 ',
      unitSystem: 'imperial',
    }).status).toBe('valid')
  })

  test('accepts exact warning-range boundaries as valid', () => {
    expect(getMeasurementValidation({
      field: 'starting_weight_lbs',
      value: '75',
      unitSystem: 'imperial',
    }).status).toBe('valid')

    expect(getMeasurementValidation({
      field: 'starting_weight_lbs',
      value: '700',
      unitSystem: 'imperial',
    }).status).toBe('valid')
  })

  test('warns outside the warning range but inside the hard range', () => {
    expect(getMeasurementValidation({
      field: 'starting_weight_lbs',
      value: '74.9',
      unitSystem: 'imperial',
    }).status).toBe('warning')

    expect(getMeasurementValidation({
      field: 'starting_weight_lbs',
      value: '700.1',
      unitSystem: 'imperial',
    }).status).toBe('warning')
  })

  test('allows exact hard boundaries but warns when they are unusual', () => {
    expect(getMeasurementValidation({
      field: 'starting_weight_lbs',
      value: '40',
      unitSystem: 'imperial',
    }).status).toBe('warning')

    expect(getMeasurementValidation({
      field: 'starting_weight_lbs',
      value: '1000',
      unitSystem: 'imperial',
    }).status).toBe('warning')
  })

  test('rejects values outside the hard range', () => {
    expect(getMeasurementValidation({
      field: 'starting_weight_lbs',
      value: '39.9',
      unitSystem: 'imperial',
    }).status).toBe('invalid')

    expect(getMeasurementValidation({
      field: 'starting_weight_lbs',
      value: '1000.1',
      unitSystem: 'imperial',
    }).status).toBe('invalid')
  })

  test('rejects more than one digit after the decimal', () => {
    expect(getMeasurementValidation({
      field: 'waist_inches',
      value: '34.25',
      unitSystem: 'imperial',
    })).toEqual({
      status: 'invalid',
      message:
        'Enter no more than one digit after the decimal point.',
    })
  })

  test('rejects non-numeric input', () => {
    expect(getMeasurementValidation({
      field: 'waist_inches',
      value: 'abc',
      unitSystem: 'imperial',
    }).status).toBe('invalid')
  })

  test('rejects a measurement field with no rule', () => {
    expect(getMeasurementValidation({
      field: 'mystery_measurement',
      value: '10',
      unitSystem: 'imperial',
    }).status).toBe('invalid')
  })

  test('uses an override label in warning feedback', () => {
    const result = getMeasurementValidation({
      field: 'starting_weight_lbs',
      value: '74.9',
      unitSystem: 'imperial',
      label: 'Morning weight',
    })

    expect(result.status).toBe('warning')
    expect(result.message).toContain('Morning weight')
  })
})

describe('Cardio minutes validation', () => {
  test.each(['', null, undefined])(
    'treats %s as unanswered',
    (value) => {
      expect(getCardioMinutesValidation(value)).toEqual({
        status: 'unanswered',
        message: '',
      })
    },
  )

  test('accepts zero cardio minutes', () => {
    expect(getCardioMinutesValidation('0')).toEqual({
      status: 'valid',
      message: '',
    })
  })

  test('accepts the top of the normal range', () => {
    expect(getCardioMinutesValidation('180').status).toBe('valid')
  })

  test('warns above the normal range but inside the hard range', () => {
    expect(getCardioMinutesValidation('181').status).toBe('warning')
    expect(getCardioMinutesValidation('600').status).toBe('warning')
  })

  test('rejects cardio above the hard maximum', () => {
    expect(getCardioMinutesValidation('601')).toEqual({
      status: 'invalid',
      message: 'Enter cardio minutes between 0 and 600.',
    })
  })

  test.each(['1.5', '-1', 'abc'])(
    'requires whole non-negative minutes: %s',
    (value) => {
      expect(getCardioMinutesValidation(value)).toEqual({
        status: 'invalid',
        message: 'Enter cardio minutes as a whole number.',
      })
    },
  )
})

describe('Check-In field mapping', () => {
  test('maps morning weight to the starting-weight rule and label', () => {
    const result = getCheckInMeasurementValidation({
      formField: 'morning_weight',
      value: '74.9',
      unitSystem: 'imperial',
    })

    expect(result.status).toBe('warning')
    expect(result.message).toContain('Morning weight')
  })

  test('maps bicep to the upper-arm measurement rule', () => {
    const result = getCheckInMeasurementValidation({
      formField: 'bicep_inches',
      value: '5',
      unitSystem: 'imperial',
    })

    expect(result.status).toBe('warning')
    expect(result.message).toContain('Bicep')
  })

  test('maps scale body fat to the body-fat rule', () => {
    const result = getCheckInMeasurementValidation({
      formField: 'scale_body_fat_percent',
      value: '2',
      unitSystem: 'imperial',
    })

    expect(result.status).toBe('warning')
    expect(result.message).toContain('Body fat')
  })

  test('routes cardio through the cardio-specific validator', () => {
    expect(getCheckInMeasurementValidation({
      formField: 'cardio_minutes',
      value: '0',
      unitSystem: 'imperial',
    })).toEqual({
      status: 'valid',
      message: '',
    })
  })

  test('rejects an unknown Check-In form field', () => {
    expect(getCheckInMeasurementValidation({
      formField: 'not_a_real_field',
      value: '10',
      unitSystem: 'imperial',
    })).toEqual({
      status: 'invalid',
      message:
        'This value can’t be validated because its measurement rule is missing.',
    })
  })
})

describe('Warning confirmation keys', () => {
  test('normalizes equivalent numeric measurement values to the same key', () => {
    expect(getWarningConfirmationKey({
      field: 'waist_inches',
      value: '34.0',
      unitSystem: 'imperial',
    })).toBe('waist_inches:imperial:34')

    expect(getWarningConfirmationKey({
      field: 'waist_inches',
      value: 34,
      unitSystem: 'imperial',
    })).toBe('waist_inches:imperial:34')
  })

  test('uses the underlying validation field for mapped Check-In fields', () => {
    expect(getCheckInWarningConfirmationKey({
      formField: 'bicep_inches',
      value: '5.0',
      unitSystem: 'imperial',
    })).toBe('upper_arm_inches:imperial:5')
  })

  test('uses a unit-independent key for cardio minutes', () => {
    expect(getCheckInWarningConfirmationKey({
      formField: 'cardio_minutes',
      value: '181',
      unitSystem: 'imperial',
    })).toBe('cardio_minutes:181')

    expect(getCheckInWarningConfirmationKey({
      formField: 'cardio_minutes',
      value: '181',
      unitSystem: 'metric',
    })).toBe('cardio_minutes:181')
  })
})

describe('Continue gating', () => {
  test('allows valid and confirmed-warning-style statuses to continue', () => {
    expect(canContinueMeasurementFields(
      ['waist_inches', 'morning_weight'],
      {
        waist_inches: { status: 'valid' },
        morning_weight: { status: 'warning' },
      },
    )).toBe(true)
  })

  test('blocks unanswered fields', () => {
    expect(canContinueMeasurementFields(
      ['waist_inches'],
      {
        waist_inches: { status: 'unanswered' },
      },
    )).toBe(false)
  })

  test('blocks invalid fields', () => {
    expect(canContinueMeasurementFields(
      ['waist_inches'],
      {
        waist_inches: { status: 'invalid' },
      },
    )).toBe(false)
  })

  test('blocks a field with no validation result', () => {
    expect(canContinueMeasurementFields(
      ['waist_inches'],
      {},
    )).toBe(false)
  })
})

describe('First invalid measurement message', () => {
  test('returns the first invalid message while ignoring unanswered fields', () => {
    const result = getFirstInvalidMeasurementMessage({
      form: {
        morning_weight: '',
        cardio_minutes: '601',
      },
      fields: ['morning_weight', 'cardio_minutes'],
      unitSystem: 'imperial',
    })

    expect(result).toBe(
      'Enter cardio minutes between 0 and 600.',
    )
  })

  test('returns an empty message when no field is invalid', () => {
    const result = getFirstInvalidMeasurementMessage({
      form: {
        morning_weight: '150',
        cardio_minutes: '181',
      },
      fields: ['morning_weight', 'cardio_minutes'],
      unitSystem: 'imperial',
    })

    expect(result).toBe('')
  })
})
