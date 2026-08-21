import {
  describe,
  expect,
  test,
} from 'vitest'

import { evaluateDeterministicPolicy } from './policyEngine.ts'
import { buildDeterministicPolicyInput } from './policyInputAdapter.ts'

function prescription(
  targetId: string,
  weekNumber: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    source_target_id: targetId,
    week_number: weekNumber,
    effective_from: `2026-08-${String(3 + (weekNumber - 1) * 7).padStart(2, '0')}`,
    effective_to: `2026-08-${String(9 + (weekNumber - 1) * 7).padStart(2, '0')}`,
    days_in_effect: 7,
    calorie_target: 1700,
    protein_grams: 165,
    carb_grams: 125,
    fat_grams: 60,
    weekly_cardio_target_minutes: 60,
    weekly_workout_target: 3,
    daily_water_goal_oz: 80,
    nutrition_ownership: 'juntos_managed',
    prescription_source: 'initial_plan',
    cardio_intensity_target: 'easy',
    ...overrides,
  }
}

function historicalWeek(
  weekNumber: number,
  targetId = 'target-a',
  overrides: Record<string, unknown> = {},
) {
  return {
    week_number: weekNumber,
    prescription: [
      prescription(targetId, weekNumber),
    ],
    behavior: {
      average_weight_lbs:
        161 - weekNumber * 0.5,
      weight_readings: 7,
      meal_plan_adherence_percent: 95,
      meal_plan_adherence_coverage_percent: 100,
      average_hunger_score: 2,
      cardio_minutes: 60,
    },
    weekly_context: {
      waist_inches: 32,
      body_fat_percent: 30,
      body_fat_source: 'scale',
      sleep_quality: 4,
      energy_level: 4,
      recovery_score: 4,
      stress_level: 2,
    },
    ...overrides,
  }
}

function packet(
  overrides: Record<string, any> = {},
) {
  const base = {
    plan: {
      goal: 'fat_loss',
      current_week_number: 3,
    },
    tracking_settings: {
      macro_distribution_preference:
        'balanced',
    },
    baseline: {
      pre_plan_deficit_weeks: 4,
    },
    current_week: {
      week_number: 3,
      prescription: [
        prescription('target-a', 3),
      ],
      behavior: {
        average_weight_lbs: 159.5,
        weight_readings: 7,
        meal_plan_adherence_percent: 95,
        meal_plan_adherence_coverage_percent: 100,
        average_hunger_score: 2,
        cardio_minutes: 60,
      },
      outcomes: {
        weekly_average_weight_lbs: 159.5,
        waist_inches: 32,
        body_fat_percent: 30,
        body_fat_source: 'scale',
      },
      context: {
        sleep_quality: 4,
        energy_level: 4,
        recovery_score: 4,
        stress_level: 2,
      },
    },
    history: [
      historicalWeek(1),
      historicalWeek(2),
    ],
    prescription_history: [
      {
        id: 'target-a',
        effective_date: '2026-08-03',
        calorie_target: 1700,
      },
    ],
  }

  return {
    ...base,
    ...overrides,
    plan: {
      ...base.plan,
      ...(overrides.plan ?? {}),
    },
    tracking_settings: {
      ...base.tracking_settings,
      ...(overrides.tracking_settings ?? {}),
    },
    baseline: {
      ...base.baseline,
      ...(overrides.baseline ?? {}),
    },
    current_week: {
      ...base.current_week,
      ...(overrides.current_week ?? {}),
    },
  }
}

function isLegal(
  result: ReturnType<typeof evaluateDeterministicPolicy>,
  actionId: string,
) {
  return result.legal_actions.some(
    (action) => action.action_id === actionId,
  )
}

describe('Big Brain policy input adapter', () => {
  test('maps live Weekly evidence and active prescription into the deterministic contract', () => {
    const input = buildDeterministicPolicyInput(
      packet(),
    )

    expect(input.completed_week_number).toBe(3)
    expect(input.goal).toBe('fat_loss')
    expect(
      input.target_loss_rate_pct_per_week,
    ).toBe(0.75)
    expect(
      input.macro_distribution_preference,
    ).toBe('balanced')
    expect(input.current_prescription).toEqual({
      calorie_target: 1700,
      protein_grams: 165,
      carb_grams: 125,
      fat_grams: 60,
      weekly_cardio_target_minutes: 60,
      cardio_intensity_target: 'easy',
      weekly_workout_target: 3,
      daily_water_goal_oz: 80,
      nutrition_ownership: 'juntos_managed',
    })
    expect(input.current_week).toMatchObject({
      week_number: 3,
      average_weight_lbs: 159.5,
      weight_readings: 7,
      nutrition_adherence_percent: 95,
      nutrition_coverage_percent: 100,
      waist_inches: 32,
      body_fat_percent: 30,
      body_fat_source: 'scale',
      cardio_minutes: 60,
    })
  })

  test('uses the explicit Balanced fallback when the preference has not been answered', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        tracking_settings: {
          macro_distribution_preference: null,
        },
      }),
    )

    expect(
      input.macro_distribution_preference,
    ).toBe('balanced')
  })

  test('preserves self-managed nutrition and prescribed cardio intensity', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        current_week: {
          prescription: [
            prescription('target-a', 3, {
              nutrition_ownership:
                'self_managed',
              cardio_intensity_target:
                'moderate',
            }),
          ],
        },
      }),
    )

    expect(
      input.current_prescription
        .nutrition_ownership,
    ).toBe('self_managed')
    expect(
      input.current_prescription
        .cardio_intensity_target,
    ).toBe('moderate')
  })

  test('counts consecutive full weeks under the active prescription', () => {
    const input = buildDeterministicPolicyInput(
      packet(),
    )

    expect(
      input.history
        .full_weeks_under_current_prescription,
    ).toBe(3)
  })

  test('a split current week contributes zero full observation weeks', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        current_week: {
          prescription: [
            prescription('target-a', 3, {
              effective_to: '2026-08-19',
              days_in_effect: 3,
            }),
            prescription('target-b', 3, {
              effective_from: '2026-08-20',
              days_in_effect: 4,
              calorie_target: 1600,
              carb_grams: 100,
              prescription_source:
                'bb_adjustment',
            }),
          ],
        },
      }),
    )

    expect(
      input.history
        .full_weeks_under_current_prescription,
    ).toBe(0)
    expect(
      input.current_prescription.calorie_target,
    ).toBe(1600)
  })

  test('the observation clock stops at the most recent material prescription change', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        history: [
          historicalWeek(1, 'target-a'),
          historicalWeek(2, 'target-b', {
            prescription: [
              prescription('target-b', 2, {
                calorie_target: 1600,
                carb_grams: 100,
              }),
            ],
          }),
        ],
        current_week: {
          prescription: [
            prescription('target-b', 3, {
              calorie_target: 1600,
              carb_grams: 100,
            }),
          ],
        },
      }),
    )

    expect(
      input.history
        .full_weeks_under_current_prescription,
    ).toBe(2)
  })

  test('a new target row with identical material values does not reset the observation clock', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        history: [
          historicalWeek(1, 'target-a'),
          historicalWeek(2, 'target-b'),
        ],
        current_week: {
          prescription: [
            prescription('target-b', 3),
          ],
        },
      }),
    )

    expect(
      input.history
        .full_weeks_under_current_prescription,
    ).toBe(3)
  })

  test('legacy rows without source IDs use material prescription equality for the observation clock', () => {
    const noId = (weekNumber: number) =>
      prescription('', weekNumber, {
        source_target_id: null,
      })

    const input = buildDeterministicPolicyInput(
      packet({
        history: [
          {
            ...historicalWeek(1),
            prescription: [noId(1)],
          },
          {
            ...historicalWeek(2),
            prescription: [noId(2)],
          },
        ],
        current_week: {
          prescription: [noId(3)],
        },
      }),
    )

    expect(
      input.history
        .full_weeks_under_current_prescription,
    ).toBe(3)
  })

  test('counts actual calorie reductions in canonical target history', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        prescription_history: [
          {
            effective_date: '2026-07-01',
            calorie_target: 1800,
          },
          {
            effective_date: '2026-07-15',
            calorie_target: 1700,
          },
          {
            effective_date: '2026-07-29',
            calorie_target: 1700,
          },
          {
            effective_date: '2026-08-12',
            calorie_target: 1600,
          },
          {
            effective_date: '2026-08-19',
            calorie_target: 1700,
          },
        ],
      }),
    )

    expect(
      input.history.prior_calorie_reductions,
    ).toBe(2)
  })

  test('continuous deficit exposure includes answered pre-plan weeks plus completed fat-loss weeks', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        baseline: {
          pre_plan_deficit_weeks: 7,
        },
      }),
    )

    expect(
      input.history.continuous_deficit_weeks,
    ).toBe(10)
  })

  test('unknown pre-plan history does not erase known in-plan deficit weeks', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        baseline: {
          pre_plan_deficit_weeks: null,
        },
      }),
    )

    expect(
      input.history.continuous_deficit_weeks,
    ).toBe(3)
  })

  test('unsupported goals do not receive the fat-loss target-rate fallback', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        plan: {
          goal: 'maintenance',
        },
      }),
    )

    expect(input.goal).toBe('maintenance')
    expect(
      input.target_loss_rate_pct_per_week,
    ).toBeNull()
    expect(
      input.history.continuous_deficit_weeks,
    ).toBeNull()
  })

  test('a missing or corrupt goal fails closed instead of defaulting to fat loss', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        plan: {
          goal: null,
        },
      }),
    )
    const result = evaluateDeterministicPolicy(
      input,
    )

    expect(input.goal).toBe('maintenance')
    expect(result.legal_actions).toHaveLength(1)
    expect(result.legal_actions[0].action_id).toBe(
      'hold',
    )
  })

  test('missing prescription data fails closed without crashing Weekly review generation', () => {
    const input = buildDeterministicPolicyInput(
      packet({
        current_week: {
          prescription: [],
        },
      }),
    )
    const result = evaluateDeterministicPolicy(
      input,
    )

    expect(input.current_prescription).toEqual({
      calorie_target: null,
      protein_grams: null,
      carb_grams: null,
      fat_grams: null,
      weekly_cardio_target_minutes: 0,
      cardio_intensity_target: null,
      weekly_workout_target: null,
      daily_water_goal_oz: null,
      nutrition_ownership: 'juntos_managed',
    })
    expect(isLegal(result, 'hold')).toBe(true)
    expect(
      isLegal(result, 'nutrition_decrease_100'),
    ).toBe(false)
  })

  test('real normalized Week 3 evidence can unlock a deterministic nutrition decrease', () => {
    const currentPacket = packet({
      current_week: {
        week_number: 3,
        behavior: {
          average_weight_lbs: 159.5,
          weight_readings: 7,
          meal_plan_adherence_percent: 95,
          meal_plan_adherence_coverage_percent: 100,
          average_hunger_score: 2,
          cardio_minutes: 60,
        },
        outcomes: {
          weekly_average_weight_lbs: 159.5,
          waist_inches: 32,
          body_fat_percent: 30,
          body_fat_source: 'scale',
        },
      },
      history: [
        historicalWeek(1, 'target-a', {
          behavior: {
            average_weight_lbs: 160.5,
            weight_readings: 7,
            meal_plan_adherence_percent: 95,
            meal_plan_adherence_coverage_percent: 100,
            average_hunger_score: 2,
            cardio_minutes: 60,
          },
        }),
        historicalWeek(2, 'target-a', {
          behavior: {
            average_weight_lbs: 160,
            weight_readings: 7,
            meal_plan_adherence_percent: 95,
            meal_plan_adherence_coverage_percent: 100,
            average_hunger_score: 2,
            cardio_minutes: 60,
          },
        }),
      ],
    })

    const result = evaluateDeterministicPolicy(
      buildDeterministicPolicyInput(
        currentPacket,
      ),
    )

    expect(
      isLegal(result, 'nutrition_decrease_100'),
    ).toBe(true)
    expect(
      result.legal_actions.find(
        (action) =>
          action.action_id ===
          'nutrition_decrease_100',
      )?.proposed_prescription,
    ).toMatchObject({
      calorie_target: 1600,
      protein_grams: 165,
    })
  })
})
