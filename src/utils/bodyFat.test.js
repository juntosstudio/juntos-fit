import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  BODY_FAT_FORMULA_VERSION,
  RFM_BODY_FAT_FORMULA_VERSION,
  calculateJuntosBodyFatEstimate,
  calculateRfmBodyFatEstimate,
} from './bodyFat'

describe('RFM body-fat estimate', () => {
  test('calculates and rounds a female estimate to one decimal place', () => {
    expect(calculateRfmBodyFatEstimate({
      waistInches: 32,
      heightCm: 165.1,
      sex: 'female',
    })).toEqual({
      percent: 35.4,
      formulaVersion: RFM_BODY_FAT_FORMULA_VERSION,
    })
  })

  test('calculates and rounds a male estimate to one decimal place', () => {
    expect(calculateRfmBodyFatEstimate({
      waistInches: 32,
      heightCm: 165.1,
      sex: 'male',
    })).toEqual({
      percent: 23.4,
      formulaVersion: RFM_BODY_FAT_FORMULA_VERSION,
    })
  })

  test('accepts numeric strings from form inputs', () => {
    expect(calculateRfmBodyFatEstimate({
      waistInches: '32',
      heightCm: '165.1',
      sex: 'female',
    })).toEqual({
      percent: 35.4,
      formulaVersion: RFM_BODY_FAT_FORMULA_VERSION,
    })
  })

  test.each([
    { waistInches: '', heightCm: 170, sex: 'female' },
    { waistInches: 0, heightCm: 170, sex: 'female' },
    { waistInches: -1, heightCm: 170, sex: 'female' },
    { waistInches: 34, heightCm: '', sex: 'female' },
    { waistInches: 34, heightCm: 0, sex: 'female' },
    { waistInches: 34, heightCm: -1, sex: 'female' },
    { waistInches: 34, heightCm: 170, sex: '' },
    { waistInches: 34, heightCm: 170, sex: 'other' },
  ])('returns null for invalid RFM inputs: %o', (args) => {
    expect(calculateRfmBodyFatEstimate(args)).toBeNull()
  })
})

describe('Legacy adult BMI/age/sex body-fat estimate', () => {
  test('calculates an adult female estimate and records its formula version', () => {
    expect(calculateJuntosBodyFatEstimate({
      weightLbs: 150,
      heightCm: 165.1,
      dateOfBirth: '1986-04-10',
      sex: 'female',
      asOfDate: '2026-08-15',
    })).toEqual({
      percent: 33.8,
      formulaVersion: BODY_FAT_FORMULA_VERSION,
    })
  })

  test('uses age before the birthday', () => {
    expect(calculateJuntosBodyFatEstimate({
      weightLbs: 180,
      heightCm: 180,
      dateOfBirth: '1990-06-15',
      sex: 'male',
      asOfDate: '2026-06-14',
    })).toEqual({
      percent: 22.1,
      formulaVersion: BODY_FAT_FORMULA_VERSION,
    })
  })

  test('increments age on the birthday', () => {
    expect(calculateJuntosBodyFatEstimate({
      weightLbs: 180,
      heightCm: 180,
      dateOfBirth: '1990-06-15',
      sex: 'male',
      asOfDate: '2026-06-15',
    })).toEqual({
      percent: 22.3,
      formulaVersion: BODY_FAT_FORMULA_VERSION,
    })
  })

  test('rejects users under age 18', () => {
    expect(calculateJuntosBodyFatEstimate({
      weightLbs: 150,
      heightCm: 170,
      dateOfBirth: '2009-08-16',
      sex: 'female',
      asOfDate: '2026-08-15',
    })).toBeNull()
  })

  test.each([
    { weightLbs: 0, heightCm: 170, dateOfBirth: '1990-01-01', sex: 'female', asOfDate: '2026-08-15' },
    { weightLbs: 150, heightCm: 0, dateOfBirth: '1990-01-01', sex: 'female', asOfDate: '2026-08-15' },
    { weightLbs: 150, heightCm: 170, dateOfBirth: 'bad-date', sex: 'female', asOfDate: '2026-08-15' },
    { weightLbs: 150, heightCm: 170, dateOfBirth: '1990-01-01', sex: 'other', asOfDate: '2026-08-15' },
  ])('returns null for invalid legacy-estimate inputs: %o', (args) => {
    expect(calculateJuntosBodyFatEstimate(args)).toBeNull()
  })
})
