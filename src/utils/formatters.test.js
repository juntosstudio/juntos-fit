import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  formatDate,
  formatDateWithOrdinal,
  formatGoal,
} from './formatters'

describe('Database date formatting', () => {
  test('formats a date key without local-time shifting', () => {
    expect(
      formatDate('2026-08-15'),
    ).toBe('August 15, 2026')
  })

  test('formats dates across year boundaries', () => {
    expect(
      formatDate('2026-12-31'),
    ).toBe('December 31, 2026')
  })

  test.each(['', null, undefined])(
    'returns an em dash for missing date %o',
    (value) => {
      expect(formatDate(value)).toBe('—')
    },
  )
})

describe('Goal formatting', () => {
  test.each([
    ['fat_loss', 'Fat Loss'],
    ['maintenance', 'Maintenance'],
    ['muscle_gain', 'Muscle Gain'],
  ])(
    'formats %s as %s',
    (goal, label) => {
      expect(formatGoal(goal)).toBe(label)
    },
  )

  test('passes through an unknown goal value', () => {
    expect(
      formatGoal('custom_goal'),
    ).toBe('custom_goal')
  })
})

describe('Ordinal date formatting', () => {
  test.each([
    ['2026-07-01', 'July 1st'],
    ['2026-07-02', 'July 2nd'],
    ['2026-07-03', 'July 3rd'],
    ['2026-07-04', 'July 4th'],
    ['2026-07-11', 'July 11th'],
    ['2026-07-12', 'July 12th'],
    ['2026-07-13', 'July 13th'],
    ['2026-07-21', 'July 21st'],
    ['2026-07-22', 'July 22nd'],
    ['2026-07-23', 'July 23rd'],
    ['2026-07-31', 'July 31st'],
  ])(
    'formats %s as %s',
    (dateKey, expected) => {
      expect(
        formatDateWithOrdinal(dateKey),
      ).toBe(expected)
    },
  )

  test.each(['', null, undefined])(
    'returns an empty string for missing date %o',
    (value) => {
      expect(
        formatDateWithOrdinal(value),
      ).toBe('')
    },
  )
})
