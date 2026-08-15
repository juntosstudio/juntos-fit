import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  calculateCaloriesFromMacros,
} from './nutritionTargets'

describe('Calories from macros', () => {
  test('uses 4 calories per gram of protein and carbs and 9 per gram of fat', () => {
    expect(calculateCaloriesFromMacros({
      protein_grams: 165,
      carb_grams: 125,
      fat_grams: 60,
    })).toBe('1700')
  })

  test('accepts numeric strings from form inputs', () => {
    expect(calculateCaloriesFromMacros({
      protein_grams: '165',
      carb_grams: '125',
      fat_grams: '60',
    })).toBe('1700')
  })

  test('supports decimal macro values', () => {
    expect(calculateCaloriesFromMacros({
      protein_grams: 100.5,
      carb_grams: 50.25,
      fat_grams: 20.5,
    })).toBe('787.5')
  })

  test('treats blank macros as zero', () => {
    expect(calculateCaloriesFromMacros({
      protein_grams: '',
      carb_grams: null,
      fat_grams: undefined,
    })).toBe('0')
  })

  test('calculates from partially completed macro fields', () => {
    expect(calculateCaloriesFromMacros({
      protein_grams: 100,
      carb_grams: '',
      fat_grams: 50,
    })).toBe('850')
  })

  test('treats negative macro values as zero', () => {
    expect(calculateCaloriesFromMacros({
      protein_grams: -100,
      carb_grams: 50,
      fat_grams: 20,
    })).toBe('380')
  })

  test('treats non-numeric macro values as zero', () => {
    expect(calculateCaloriesFromMacros({
      protein_grams: 'nope',
      carb_grams: 50,
      fat_grams: 20,
    })).toBe('380')
  })

  test('treats non-finite macro values as zero', () => {
    expect(calculateCaloriesFromMacros({
      protein_grams: Infinity,
      carb_grams: 50,
      fat_grams: 20,
    })).toBe('380')
  })
})
