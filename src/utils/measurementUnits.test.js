import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  UNIT_SYSTEM_OPTIONS,
  formatMeasurementValue,
  fromCanonicalMeasurement,
  getMeasurementUnit,
  normalizeUnitSystem,
  toCanonicalMeasurement,
} from './measurementUnits'

describe('Unit-system options and normalization', () => {
  test('offers imperial and metric unit systems', () => {
    expect(UNIT_SYSTEM_OPTIONS).toEqual([
      {
        value: 'imperial',
        label: 'Imperial — pounds and inches',
      },
      {
        value: 'metric',
        label: 'Metric — kilograms and centimeters',
      },
    ])
  })

  test('preserves metric', () => {
    expect(normalizeUnitSystem('metric')).toBe('metric')
  })

  test.each([
    'imperial',
    '',
    null,
    undefined,
    'stones',
  ])(
    'normalizes %s to imperial',
    (value) => {
      expect(normalizeUnitSystem(value)).toBe('imperial')
    },
  )
})

describe('Measurement-unit labels', () => {
  test('uses pounds for canonical weight in imperial mode', () => {
    expect(
      getMeasurementUnit(
        'starting_weight_lbs',
        'imperial',
      ),
    ).toBe('lbs')
  })

  test('uses kilograms for weight in metric mode', () => {
    expect(
      getMeasurementUnit(
        'starting_weight_lbs',
        'metric',
      ),
    ).toBe('kg')
  })

  test.each([
    'neck_inches',
    'chest_inches',
    'waist_inches',
    'hips_inches',
    'upper_arm_inches',
    'thigh_inches',
    'calf_inches',
  ])(
    'uses inches/centimeters for circumference field %s',
    (field) => {
      expect(
        getMeasurementUnit(
          field,
          'imperial',
        ),
      ).toBe('in')

      expect(
        getMeasurementUnit(
          field,
          'metric',
        ),
      ).toBe('cm')
    },
  )

  test('uses percent for body fat regardless of unit system', () => {
    expect(
      getMeasurementUnit(
        'body_fat_percent',
        'imperial',
      ),
    ).toBe('%')

    expect(
      getMeasurementUnit(
        'body_fat_percent',
        'metric',
      ),
    ).toBe('%')
  })

  test('returns no unit for an unknown field', () => {
    expect(
      getMeasurementUnit(
        'mystery_field',
        'metric',
      ),
    ).toBe('')
  })
})

describe('Convert displayed measurements to canonical pounds/inches', () => {
  test.each(['', null, undefined])(
    'returns null for blank display value %s',
    (displayValue) => {
      expect(
        toCanonicalMeasurement(
          'waist_inches',
          displayValue,
          'imperial',
        ),
      ).toBeNull()
    },
  )

  test('returns null for a non-numeric display value', () => {
    expect(
      toCanonicalMeasurement(
        'waist_inches',
        'abc',
        'imperial',
      ),
    ).toBeNull()
  })

  test('keeps imperial weight in pounds and rounds to two decimals', () => {
    expect(
      toCanonicalMeasurement(
        'starting_weight_lbs',
        150.126,
        'imperial',
      ),
    ).toBe(150.13)
  })

  test('converts metric weight from kilograms to pounds', () => {
    expect(
      toCanonicalMeasurement(
        'starting_weight_lbs',
        68,
        'metric',
      ),
    ).toBe(149.91)
  })

  test('keeps imperial circumference in inches', () => {
    expect(
      toCanonicalMeasurement(
        'waist_inches',
        34.126,
        'imperial',
      ),
    ).toBe(34.13)
  })

  test('converts metric circumference from centimeters to inches', () => {
    expect(
      toCanonicalMeasurement(
        'waist_inches',
        100,
        'metric',
      ),
    ).toBe(39.37)
  })

  test('accepts numeric strings from form inputs', () => {
    expect(
      toCanonicalMeasurement(
        'waist_inches',
        '86.36',
        'metric',
      ),
    ).toBe(34)
  })

  test('leaves body-fat percent unchanged in metric mode', () => {
    expect(
      toCanonicalMeasurement(
        'body_fat_percent',
        27.46,
        'metric',
      ),
    ).toBe(27.46)
  })

  test('leaves unknown numeric fields unchanged except for rounding', () => {
    expect(
      toCanonicalMeasurement(
        'mystery_field',
        12.345,
        'metric',
      ),
    ).toBe(12.35)
  })
})

describe('Convert canonical pounds/inches to display units', () => {
  test.each(['', null, undefined])(
    'returns an empty string for blank canonical value %s',
    (canonicalValue) => {
      expect(
        fromCanonicalMeasurement(
          'waist_inches',
          canonicalValue,
          'imperial',
        ),
      ).toBe('')
    },
  )

  test('returns an empty string for a non-numeric canonical value', () => {
    expect(
      fromCanonicalMeasurement(
        'waist_inches',
        'abc',
        'imperial',
      ),
    ).toBe('')
  })

  test('formats imperial weight to one decimal place', () => {
    expect(
      fromCanonicalMeasurement(
        'starting_weight_lbs',
        150.04,
        'imperial',
      ),
    ).toBe('150.0')
  })

  test('converts canonical pounds to metric kilograms', () => {
    expect(
      fromCanonicalMeasurement(
        'starting_weight_lbs',
        150,
        'metric',
      ),
    ).toBe('68.0')
  })

  test('formats imperial circumference to one decimal place', () => {
    expect(
      fromCanonicalMeasurement(
        'waist_inches',
        34,
        'imperial',
      ),
    ).toBe('34.0')
  })

  test('converts canonical inches to metric centimeters', () => {
    expect(
      fromCanonicalMeasurement(
        'waist_inches',
        34,
        'metric',
      ),
    ).toBe('86.4')
  })

  test('leaves body-fat percent unchanged apart from display rounding', () => {
    expect(
      fromCanonicalMeasurement(
        'body_fat_percent',
        27.46,
        'metric',
      ),
    ).toBe('27.5')
  })

  test('accepts numeric strings from persisted data', () => {
    expect(
      fromCanonicalMeasurement(
        'waist_inches',
        '34',
        'metric',
      ),
    ).toBe('86.4')
  })
})

describe('Measurement round trips', () => {
  test('keeps an imperial circumference stable through canonical conversion', () => {
    const canonical = toCanonicalMeasurement(
      'waist_inches',
      34.2,
      'imperial',
    )

    expect(
      fromCanonicalMeasurement(
        'waist_inches',
        canonical,
        'imperial',
      ),
    ).toBe('34.2')
  })

  test('keeps a metric circumference effectively stable through canonical conversion', () => {
    const canonical = toCanonicalMeasurement(
      'waist_inches',
      86.4,
      'metric',
    )

    expect(
      fromCanonicalMeasurement(
        'waist_inches',
        canonical,
        'metric',
      ),
    ).toBe('86.4')
  })

  test('keeps a metric weight effectively stable through canonical conversion', () => {
    const canonical = toCanonicalMeasurement(
      'starting_weight_lbs',
      68,
      'metric',
    )

    expect(
      fromCanonicalMeasurement(
        'starting_weight_lbs',
        canonical,
        'metric',
      ),
    ).toBe('68.0')
  })
})

describe('Measurement display formatting', () => {
  test.each(['', null, undefined])(
    'shows Not entered for blank display value %s',
    (displayValue) => {
      expect(
        formatMeasurementValue(
          'waist_inches',
          displayValue,
          'imperial',
        ),
      ).toBe('Not entered')
    },
  )

  test('shows Not entered for a non-numeric value', () => {
    expect(
      formatMeasurementValue(
        'waist_inches',
        'abc',
        'imperial',
      ),
    ).toBe('Not entered')
  })

  test('formats imperial measurements with one decimal place and unit', () => {
    expect(
      formatMeasurementValue(
        'waist_inches',
        34,
        'imperial',
      ),
    ).toBe('34.0 in')
  })

  test('formats metric measurements with one decimal place and unit', () => {
    expect(
      formatMeasurementValue(
        'waist_inches',
        86.36,
        'metric',
      ),
    ).toBe('86.4 cm')
  })

  test('formats metric weight with kilograms', () => {
    expect(
      formatMeasurementValue(
        'starting_weight_lbs',
        68,
        'metric',
      ),
    ).toBe('68.0 kg')
  })

  test('formats body-fat values with percent', () => {
    expect(
      formatMeasurementValue(
        'body_fat_percent',
        27.46,
        'imperial',
      ),
    ).toBe('27.5 %')
  })
})
