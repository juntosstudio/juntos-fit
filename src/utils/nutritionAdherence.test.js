import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  calculateNutritionAdherence,
  getDailyNutritionAdherencePercent,
  getNutritionAdherenceBand,
  isPlannedCheatMealOnly,
} from './nutritionAdherence'

function row(
  score,
  overrides = {},
) {
  return {
    checkin_date: '2026-08-20',
    meal_plan_score: score,
    planned_cheat_meal_status: null,
    meal_plan_deviation_details: null,
    ...overrides,
  }
}

describe('nutrition adherence policy', () => {
  test.each([
    [5, 100],
    [4, 95],
    [3, 80],
    [2, 60],
    [1, 30],
  ])(
    'maps meal-plan score %s to %s%%',
    (score, expected) => {
      expect(
        getDailyNutritionAdherencePercent(
          row(score),
        ),
      ).toBe(expected)
    },
  )

  test('treats a planned cheat meal as fully adherent when it was the only deviation', () => {
    const value = row(2, {
      planned_cheat_meal_status: 'eaten',
      meal_plan_deviation_details: null,
    })

    expect(
      isPlannedCheatMealOnly(value),
    ).toBe(true)
    expect(
      getDailyNutritionAdherencePercent(
        value,
      ),
    ).toBe(100)
  })

  test('uses the self-reported score when a cheat meal also had other deviations', () => {
    const value = row(3, {
      planned_cheat_meal_status: 'eaten',
      meal_plan_deviation_details:
        'Also had drinks and extra snacks.',
    })

    expect(
      isPlannedCheatMealOnly(value),
    ).toBe(false)
    expect(
      getDailyNutritionAdherencePercent(
        value,
      ),
    ).toBe(80)
  })

  test('does not treat a missing meal score as zero adherence', () => {
    expect(
      getDailyNutritionAdherencePercent(
        row(null),
      ),
    ).toBeNull()
  })

  test('averages reported days without turning a missing day into a zero', () => {
    const result = calculateNutritionAdherence(
      [
        row(5),
        row(5),
        row(5),
        row(5),
        row(5),
        row(4),
      ],
      { expectedDays: 7 },
    )

    expect(result.adherencePercent).toBe(99)
    expect(result.daysReported).toBe(6)
    expect(result.coveragePercent).toBe(86)
    expect(result.band).toBe('strong')
  })

  test('one significantly off-plan day does not erase six strong days', () => {
    const result = calculateNutritionAdherence(
      [
        row(5),
        row(5),
        row(5),
        row(5),
        row(5),
        row(5),
        row(2),
      ],
      { expectedDays: 7 },
    )

    expect(result.adherencePercent).toBe(94)
    expect(result.coveragePercent).toBe(100)
    expect(result.band).toBe('strong')
  })

  test('keeps high adherence limited when coverage is too low', () => {
    const result = calculateNutritionAdherence(
      [row(5), row(5), row(5)],
      { expectedDays: 7 },
    )

    expect(result.adherencePercent).toBe(100)
    expect(result.coveragePercent).toBe(43)
    expect(result.band).toBe('limited_data')
    expect(result.dataConfidence).toBe('limited')
  })

  test('keeps 80-84 percent usable but not strong', () => {
    expect(
      getNutritionAdherenceBand({
        adherencePercent: 82,
        coveragePercent: 100,
      }),
    ).toBe('usable')
  })

  test('requires 85 percent for strong adherence', () => {
    expect(
      getNutritionAdherenceBand({
        adherencePercent: 85,
        coveragePercent: 100,
      }),
    ).toBe('strong')
  })
})
