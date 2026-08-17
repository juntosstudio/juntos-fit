import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  CARDIO_INTENSITY_OPTIONS,
  CARDIO_TYPE_OPTIONS,
  getCardioContextLabel,
  getCardioIntensityLabel,
  getCardioTypeLabel,
  isCardioIntensity,
  isCardioType,
} from './cardio'

describe('cardio vocabulary', () => {
  test('keeps the V1 cardio type choices in the intended order', () => {
    expect(
      CARDIO_TYPE_OPTIONS.map(
        (option) => option.label,
      ),
    ).toEqual([
      'Walking',
      'Running / Jogging',
      'HIIT / Intervals',
      'StairMaster / Step Machine',
      'Cycling',
      'Elliptical / Rowing',
      'Mixed',
      'Other',
    ])
  })

  test('offers easy, moderate, and hard effort', () => {
    expect(
      CARDIO_INTENSITY_OPTIONS.map(
        (option) => option.label,
      ),
    ).toEqual([
      'Easy',
      'Moderate',
      'Hard',
    ])
  })

  test('validates and formats saved cardio context', () => {
    expect(isCardioType('walking')).toBe(
      true,
    )
    expect(
      isCardioIntensity('moderate'),
    ).toBe(true)
    expect(isCardioType('swimming')).toBe(
      false,
    )

    expect(
      getCardioTypeLabel('hiit_intervals'),
    ).toBe('HIIT / Intervals')
    expect(
      getCardioIntensityLabel('hard'),
    ).toBe('Hard')
    expect(
      getCardioContextLabel({
        cardioType: 'walking',
        cardioIntensity: 'moderate',
      }),
    ).toBe('Walking · Moderate')
  })
})
