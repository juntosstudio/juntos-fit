import {
  describe,
  expect,
  test,
} from 'vitest'

import { applyRoutineCalorieAdjustment } from './macroPolicy.ts'
import { evaluateDeterministicPolicy } from './policyEngine.ts'
import type {
  DeterministicPolicyInput,
  PolicyActionId,
  PolicyWeekEvidence,
} from './policyTypes.ts'

function week(
  weekNumber: number,
  overrides: Partial<PolicyWeekEvidence> = {},
): PolicyWeekEvidence {
  return {
    week_number: weekNumber,
    average_weight_lbs: 160,
    weight_readings: 7,
    nutrition_adherence_percent: 95,
    nutrition_coverage_percent: 100,
    waist_inches: 32,
    body_fat_percent: 30,
    body_fat_source: 'scale',
    average_hunger_score: 2,
    sleep_quality: 4,
    energy_level: 4,
    recovery_score: 4,
    stress_level: 2,
    cardio_minutes: 60,
    ...overrides,
  }
}

function input(
  overrides: Partial<DeterministicPolicyInput> = {},
): DeterministicPolicyInput {
  return {
    completed_week_number: 4,
    goal: 'fat_loss',
    target_loss_rate_pct_per_week: 0.75,
    macro_distribution_preference: 'balanced',
    current_prescription: {
      calorie_target: 1700,
      protein_grams: 165,
      carb_grams: 125,
      fat_grams: 60,
      weekly_cardio_target_minutes: 60,
      cardio_intensity_target: 'easy',
      weekly_workout_target: 3,
      daily_water_goal_oz: 80,
      nutrition_ownership: 'juntos_managed',
    },
    current_week: week(4, {
      average_weight_lbs: 160,
      waist_inches: 32,
    }),
    previous_week: week(3, {
      average_weight_lbs: 160.5,
      waist_inches: 32,
    }),
    recent_weeks: [
      week(2, {
        average_weight_lbs: 160.4,
      }),
      week(3, {
        average_weight_lbs: 160.3,
      }),
      week(4, {
        average_weight_lbs: 160.2,
      }),
    ],
    history: {
      full_weeks_under_current_prescription: 2,
      continuous_deficit_weeks: 6,
      prior_calorie_reductions: 1,
    },
    minimum_fat_grams: 45,
    ...overrides,
  }
}

function action(
  result: ReturnType<typeof evaluateDeterministicPolicy>,
  actionId: PolicyActionId,
) {
  return [
    ...result.legal_actions,
    ...result.blocked_actions,
  ].find(
    (candidate) =>
      candidate.action_id === actionId,
  )
}

function isLegal(
  result: ReturnType<typeof evaluateDeterministicPolicy>,
  actionId: PolicyActionId,
) {
  return result.legal_actions.some(
    (candidate) =>
      candidate.action_id === actionId,
  )
}

describe('deterministic Big Brain policy', () => {
  test('HOLD is always legal', () => {
    const result = evaluateDeterministicPolicy(
      input(),
    )

    expect(isLegal(result, 'hold')).toBe(true)
  })

  test('HOLD preserves the current prescription exactly', () => {
    const policyInput = input()
    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      action(result, 'hold')?.proposed_prescription,
    ).toEqual(policyInput.current_prescription)
  })

  test('the first completed week is observation-only', () => {
    const result = evaluateDeterministicPolicy(
      input({
        completed_week_number: 1,
        history: {
          full_weeks_under_current_prescription: 1,
          continuous_deficit_weeks: 1,
          prior_calorie_reductions: 0,
        },
      }),
    )

    expect(
      action(result, 'nutrition_decrease_100')
        ?.blocker_codes,
    ).toContain('FIRST_TWO_WEEKS_OBSERVATION')
    expect(result.legal_actions).toHaveLength(1)
  })

  test('a second full completed week can unlock the Week 3 prescription', () => {
    const result = evaluateDeterministicPolicy(
      input({
        completed_week_number: 2,
        history: {
          full_weeks_under_current_prescription: 2,
          continuous_deficit_weeks: 2,
          prior_calorie_reductions: 0,
        },
      }),
    )

    expect(
      isLegal(result, 'nutrition_decrease_100'),
    ).toBe(true)
  })

  test('one full week after a material change blocks another change', () => {
    const result = evaluateDeterministicPolicy(
      input({
        history: {
          full_weeks_under_current_prescription: 1,
          continuous_deficit_weeks: 8,
          prior_calorie_reductions: 2,
        },
      }),
    )

    expect(
      action(result, 'nutrition_decrease_100')
        ?.blocker_codes,
    ).toContain('OBSERVATION_CLOCK_NOT_READY')
    expect(
      action(result, 'cardio_increase_60_to_75')
        ?.blocker_codes,
    ).toContain('OBSERVATION_CLOCK_NOT_READY')
  })

  test('very slow progress below 50% of target can legalize -100', () => {
    const result = evaluateDeterministicPolicy(
      input(),
    )

    const decrease = action(
      result,
      'nutrition_decrease_100',
    )

    expect(decrease?.legal).toBe(true)
    expect(decrease?.reason_codes).toContain(
      'PACE_VERY_SLOW_LT_50',
    )
  })

  test('slow progress from 50% through 74% can legalize -100', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          average_weight_lbs: 159.8,
        }),
        previous_week: week(3, {
          average_weight_lbs: 160.5,
        }),
      }),
    )

    const decrease = action(
      result,
      'nutrition_decrease_100',
    )

    expect(decrease?.legal).toBe(true)
    expect(decrease?.reason_codes).toContain(
      'PACE_SLOW_50_TO_74',
    )
  })

  test('75% of target pace is inside the HOLD band, not a cut gate', () => {
    const previous = 160
    const targetLoss = previous * 0.0075
    const current =
      previous - targetLoss * 0.75

    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          average_weight_lbs: current,
        }),
        previous_week: week(3, {
          average_weight_lbs: previous,
        }),
      }),
    )

    expect(
      isLegal(result, 'nutrition_decrease_100'),
    ).toBe(false)
  })

  test('125% of target pace remains inside the HOLD band', () => {
    const previous = 160
    const targetLoss = previous * 0.0075
    const current =
      previous - targetLoss * 1.25

    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          average_weight_lbs: current,
        }),
        previous_week: week(3, {
          average_weight_lbs: previous,
        }),
      }),
    )

    expect(
      isLegal(result, 'nutrition_increase_100'),
    ).toBe(false)
  })

  test('faster than 125% of target pace can legalize +100', () => {
    const previous = 160
    const targetLoss = previous * 0.0075
    const current =
      previous - targetLoss * 1.3

    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          average_weight_lbs: current,
        }),
        previous_week: week(3, {
          average_weight_lbs: previous,
        }),
      }),
    )

    expect(
      isLegal(result, 'nutrition_increase_100'),
    ).toBe(true)
    expect(
      action(result, 'nutrition_increase_100')
        ?.reason_codes,
    ).toContain('PACE_FAST_GT_125')
  })

  test('diet fatigue at meaningful loss pace can legalize +100', () => {
    const previous = 160
    const targetLoss = previous * 0.0075
    const current = previous - targetLoss

    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          average_weight_lbs: current,
          average_hunger_score: 4.2,
        }),
        previous_week: week(3, {
          average_weight_lbs: previous,
        }),
      }),
    )

    expect(
      isLegal(result, 'nutrition_increase_100'),
    ).toBe(true)
    expect(result.signals.diet_fatigue).toBe(true)
  })

  test('diet fatigue blocks a further calorie decrease', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          average_weight_lbs: 160,
          average_hunger_score: 4,
        }),
      }),
    )

    expect(
      action(result, 'nutrition_decrease_100')
        ?.blocker_codes,
    ).toContain('DIET_FATIGUE_PRESENT')
  })

  test('84% adherence is usable evidence but not enough to change nutrition', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          nutrition_adherence_percent: 84,
        }),
      }),
    )

    expect(result.signals.data_confidence).toBe(
      'medium',
    )
    expect(
      action(result, 'nutrition_decrease_100')
        ?.blocker_codes,
    ).toContain(
      'NUTRITION_ADHERENCE_USABLE_NOT_STRONG',
    )
  })

  test('85% adherence meets the strong gate', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          nutrition_adherence_percent: 85,
        }),
      }),
    )

    expect(result.signals.data_confidence).toBe(
      'high',
    )
    expect(
      action(result, 'nutrition_decrease_100')
        ?.blocker_codes,
    ).not.toContain('NUTRITION_ADHERENCE_INSUFFICIENT')
  })

  test('79% coverage blocks material changes even with 100% reported adherence', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          nutrition_adherence_percent: 100,
          nutrition_coverage_percent: 79,
        }),
      }),
    )

    expect(
      action(result, 'nutrition_decrease_100')
        ?.blocker_codes,
    ).toContain('NUTRITION_COVERAGE_INSUFFICIENT')
  })

  test('fewer than five weigh-ins blocks rate-based changes', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          weight_readings: 4,
        }),
      }),
    )

    expect(
      action(result, 'nutrition_decrease_100')
        ?.blocker_codes,
    ).toContain('WEIGHT_DATA_INSUFFICIENT')
  })

  test('missing target pace blocks rate-based changes', () => {
    const result = evaluateDeterministicPolicy(
      input({
        target_loss_rate_pct_per_week: null,
      }),
    )

    expect(
      action(result, 'nutrition_decrease_100')
        ?.blocker_codes,
    ).toContain('TARGET_LOSS_RATE_MISSING')
  })

  test('self-managed nutrition blocks proactive +/-100 nutrition changes', () => {
    const policyInput = input()
    policyInput.current_prescription = {
      ...policyInput.current_prescription,
      nutrition_ownership: 'self_managed',
    }

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      action(result, 'nutrition_decrease_100')
        ?.blocker_codes,
    ).toContain('NUTRITION_SELF_MANAGED')
    expect(
      action(result, 'nutrition_increase_100')
        ?.blocker_codes,
    ).toContain('NUTRITION_SELF_MANAGED')
  })

  test('self-managed nutrition does not automatically block independent cardio policy', () => {
    const policyInput = input()
    policyInput.current_prescription = {
      ...policyInput.current_prescription,
      nutrition_ownership: 'self_managed',
    }

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      isLegal(result, 'cardio_increase_60_to_75'),
    ).toBe(true)
  })

  test('meaningful waist progress blocks an unnecessary calorie cut', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          waist_inches: 31.7,
        }),
        previous_week: week(3, {
          average_weight_lbs: 160.5,
          waist_inches: 32,
        }),
      }),
    )

    expect(
      action(result, 'nutrition_decrease_100')
        ?.blocker_codes,
    ).toContain('WAIST_PROGRESS_PRESENT')
  })

  test('body-fat progress is supporting evidence and does not by itself control legality', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          body_fat_percent: 29.4,
        }),
        previous_week: week(3, {
          average_weight_lbs: 160.5,
          body_fat_percent: 30,
        }),
      }),
    )

    expect(
      result.signals.body_fat_progress_supporting,
    ).toBe(true)
    expect(
      isLegal(result, 'nutrition_decrease_100'),
    ).toBe(true)
  })

  test('stress score 5 means very manageable and does not create a recovery concern', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          sleep_quality: 2,
          energy_level: 4,
          recovery_score: 4,
          stress_level: 5,
        }),
      }),
    )

    expect(result.signals.recovery_concern).toBe(
      false,
    )
  })

  test('stress score 1 means overwhelming and can compound a low recovery signal', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          sleep_quality: 2,
          energy_level: 4,
          recovery_score: 4,
          stress_level: 1,
        }),
      }),
    )

    expect(result.signals.recovery_concern).toBe(
      true,
    )
  })

  test('poor recovery blocks both a further cut and a cardio increase', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          sleep_quality: 2,
          energy_level: 2,
          recovery_score: 4,
        }),
      }),
    )

    expect(result.signals.recovery_concern).toBe(
      true,
    )
    expect(
      isLegal(result, 'nutrition_decrease_100'),
    ).toBe(false)
    expect(
      isLegal(result, 'cardio_increase_60_to_75'),
    ).toBe(false)
  })

  test('60 minutes progresses only to 75', () => {
    const result = evaluateDeterministicPolicy(
      input(),
    )

    expect(
      isLegal(result, 'cardio_increase_60_to_75'),
    ).toBe(true)
    expect(
      action(result, 'cardio_increase_60_to_75')
        ?.proposed_prescription
        ?.weekly_cardio_target_minutes,
    ).toBe(75)
  })

  test('75 minutes progresses only to 90', () => {
    const policyInput = input()
    policyInput.current_prescription = {
      ...policyInput.current_prescription,
      weekly_cardio_target_minutes: 75,
    }
    policyInput.current_week = week(4, {
      average_weight_lbs: 160,
      cardio_minutes: 75,
    })

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      isLegal(result, 'cardio_increase_75_to_90'),
    ).toBe(true)
  })

  test('90 easy minutes progresses intensity to moderate rather than adding minutes', () => {
    const policyInput = input()
    policyInput.current_prescription = {
      ...policyInput.current_prescription,
      weekly_cardio_target_minutes: 90,
      cardio_intensity_target: 'easy',
    }
    policyInput.current_week = week(4, {
      average_weight_lbs: 160,
      cardio_minutes: 90,
    })

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      isLegal(
        result,
        'cardio_increase_intensity_to_moderate',
      ),
    ).toBe(true)
    expect(
      action(
        result,
        'cardio_increase_intensity_to_moderate',
      )?.proposed_prescription
        ?.cardio_intensity_target,
    ).toBe('moderate')
  })

  test('90 moderate minutes marks ordinary cardio progression addressed', () => {
    const policyInput = input()
    policyInput.current_prescription = {
      ...policyInput.current_prescription,
      weekly_cardio_target_minutes: 90,
      cardio_intensity_target: 'moderate',
    }
    policyInput.current_week = week(4, {
      cardio_minutes: 90,
    })

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(result.signals.cardio_addressed).toBe(
      true,
    )
    expect(
      result.legal_actions.filter(
        (candidate) =>
          candidate.category === 'cardio',
      ),
    ).toHaveLength(0)
  })

  test('cardio must be completed before the target is increased', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          cardio_minutes: 59,
        }),
      }),
    )

    expect(
      action(result, 'cardio_increase_60_to_75')
        ?.blocker_codes,
    ).toContain('CARDIO_TARGET_NOT_MET')
  })

  test('unsupported cardio targets fail closed rather than inventing a progression', () => {
    const policyInput = input()
    policyInput.current_prescription = {
      ...policyInput.current_prescription,
      weekly_cardio_target_minutes: 45,
    }
    policyInput.current_week = week(4, {
      cardio_minutes: 45,
    })

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      result.legal_actions.filter(
        (candidate) =>
          candidate.category === 'cardio',
      ),
    ).toHaveLength(0)
    expect(
      action(result, 'cardio_progression_unavailable')
        ?.blocker_codes,
    ).toContain('CARDIO_TARGET_NOT_ON_POLICY_LADDER')
  })

  test('missing waist data is represented as unknown rather than falsely called no progress', () => {
    const result = evaluateDeterministicPolicy(
      input({
        current_week: week(4, {
          average_weight_lbs: 160,
          waist_inches: null,
        }),
        previous_week: week(3, {
          average_weight_lbs: 160.5,
          waist_inches: null,
        }),
      }),
    )

    expect(
      action(result, 'nutrition_decrease_100')
        ?.reason_codes,
    ).toContain('WAIST_DATA_UNAVAILABLE')
    expect(
      action(result, 'nutrition_decrease_100')
        ?.reason_codes,
    ).not.toContain('NO_MEANINGFUL_WAIST_PROGRESS')
  })

  test('maintenance fails closed to HOLD until its own policy exists', () => {
    const result = evaluateDeterministicPolicy(
      input({ goal: 'maintenance' }),
    )

    expect(result.legal_actions).toHaveLength(1)
    expect(result.legal_actions[0].action_id).toBe(
      'hold',
    )
    expect(
      result.blocked_actions.every(
        (candidate) =>
          candidate.blocker_codes.includes(
            'GOAL_NOT_SUPPORTED_FOR_ADJUSTMENT',
          ),
      ),
    ).toBe(true)
  })

  test('muscle gain fails closed to HOLD until its own policy exists', () => {
    const result = evaluateDeterministicPolicy(
      input({ goal: 'muscle_gain' }),
    )

    expect(result.legal_actions).toHaveLength(1)
  })
})

describe('routine +/-100 macro math', () => {
  const prescription = input().current_prescription

  test('higher-carb changes 25g carbs and keeps protein/fat fixed', () => {
    const result = applyRoutineCalorieAdjustment({
      prescription,
      direction: 'decrease',
      preference: 'higher_carb',
    })

    expect(result.legal).toBe(true)
    expect(result.protein_delta).toBe(0)
    expect(result.carb_delta).toBe(-25)
    expect(result.fat_delta).toBe(0)
    expect(result.calorie_delta).toBe(-100)
  })

  test('balanced changes 16g carbs and 4g fat for exactly 100 macro calories', () => {
    const result = applyRoutineCalorieAdjustment({
      prescription,
      direction: 'decrease',
      preference: 'balanced',
      minimumFatGrams: 45,
    })

    expect(result.carb_delta).toBe(-16)
    expect(result.fat_delta).toBe(-4)
    expect(
      Math.abs(result.carb_delta) * 4 +
        Math.abs(result.fat_delta) * 9,
    ).toBe(100)
  })

  test('lower-carb changes 7g carbs and 8g fat for exactly 100 macro calories', () => {
    const result = applyRoutineCalorieAdjustment({
      prescription,
      direction: 'decrease',
      preference: 'lower_carb',
      minimumFatGrams: 45,
    })

    expect(result.carb_delta).toBe(-7)
    expect(result.fat_delta).toBe(-8)
    expect(
      Math.abs(result.carb_delta) * 4 +
        Math.abs(result.fat_delta) * 9,
    ).toBe(100)
  })

  test('protein never changes during routine +/-100 adjustments', () => {
    const decrease = applyRoutineCalorieAdjustment({
      prescription,
      direction: 'decrease',
      preference: 'balanced',
      minimumFatGrams: 45,
    })
    const increase = applyRoutineCalorieAdjustment({
      prescription,
      direction: 'increase',
      preference: 'balanced',
    })

    expect(decrease.protein_delta).toBe(0)
    expect(increase.protein_delta).toBe(0)
  })

  test('a missing fat floor preserves current fat instead of assuming zero', () => {
    const result = applyRoutineCalorieAdjustment({
      prescription,
      direction: 'decrease',
      preference: 'lower_carb',
    })

    expect(result.legal).toBe(true)
    expect(result.fat_delta).toBe(0)
    expect(result.carb_delta).toBe(-25)
    expect(
      result.proposed_prescription?.fat_grams,
    ).toBe(prescription.fat_grams)
  })

  test('a fat floor shifts a reduction back toward carbs', () => {
    const result = applyRoutineCalorieAdjustment({
      prescription: {
        ...prescription,
        carb_grams: 150,
        fat_grams: 47,
      },
      direction: 'decrease',
      preference: 'lower_carb',
      minimumFatGrams: 45,
    })

    expect(result.legal).toBe(true)
    expect(result.fat_delta).toBe(0)
    expect(result.carb_delta).toBe(-25)
    expect(
      result.proposed_prescription?.fat_grams,
    ).toBe(47)
  })

  test('incomplete macros fail closed', () => {
    const result = applyRoutineCalorieAdjustment({
      prescription: {
        ...prescription,
        carb_grams: null,
      },
      direction: 'decrease',
      preference: 'balanced',
    })

    expect(result.legal).toBe(false)
    expect(result.proposed_prescription).toBeNull()
  })
})

describe('Calorie Reset eligibility', () => {
  function resetInput(
    overrides: Partial<DeterministicPolicyInput> = {},
  ) {
    const base = input()

    return {
      ...base,
      completed_week_number: 10,
      current_prescription: {
        ...base.current_prescription,
        weekly_cardio_target_minutes: 90,
        cardio_intensity_target: 'moderate' as const,
      },
      current_week: week(10, {
        average_weight_lbs: 160.2,
        cardio_minutes: 90,
        average_hunger_score: 4,
      }),
      previous_week: week(9, {
        average_weight_lbs: 160.25,
        cardio_minutes: 90,
      }),
      recent_weeks: [
        week(8, {
          average_weight_lbs: 160.3,
          waist_inches: 32,
        }),
        week(9, {
          average_weight_lbs: 160.25,
          waist_inches: 32,
        }),
        week(10, {
          average_weight_lbs: 160.2,
          waist_inches: 32,
          average_hunger_score: 4,
          cardio_minutes: 90,
        }),
      ],
      history: {
        full_weeks_under_current_prescription: 3,
        continuous_deficit_weeks: 10,
        prior_calorie_reductions: 2,
      },
      ...overrides,
    } satisfies DeterministicPolicyInput
  }

  test('reset is not legal before 10 continuous deficit weeks', () => {
    const policyInput = resetInput()
    policyInput.history = {
      ...policyInput.history,
      continuous_deficit_weeks: 9,
    }

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(result.calorie_reset.status).not.toBe(
      'eligible',
    )
    expect(
      action(result, 'calorie_reset_increase_100')
        ?.legal,
    ).toBe(false)
  })

  test('reset becomes eligible only when all five hard criteria are met', () => {
    const result = evaluateDeterministicPolicy(
      resetInput(),
    )

    expect(result.calorie_reset.status).toBe(
      'eligible',
    )
    expect(result.calorie_reset.criteria).toEqual({
      continuous_deficit_weeks: true,
      prior_calorie_reductions: true,
      cardio_addressed: true,
      three_week_plateau: true,
      diet_fatigue: true,
    })
    expect(
      isLegal(result, 'calorie_reset_increase_100'),
    ).toBe(true)
  })

  test('reset restores carbs first regardless of ordinary macro preference', () => {
    const policyInput = resetInput({
      macro_distribution_preference: 'lower_carb',
    })
    const result = evaluateDeterministicPolicy(
      policyInput,
    )
    const resetAction = action(
      result,
      'calorie_reset_increase_100',
    )

    expect(
      resetAction?.proposed_prescription?.protein_grams,
    ).toBe(
      policyInput.current_prescription.protein_grams,
    )
    expect(
      resetAction?.proposed_prescription?.fat_grams,
    ).toBe(
      policyInput.current_prescription.fat_grams,
    )
    expect(
      resetAction?.proposed_prescription?.carb_grams,
    ).toBe(
      (policyInput.current_prescription.carb_grams ?? 0) +
        25,
    )
  })

  test('reset entry still requires two completed observation weeks in Juntos', () => {
    const policyInput = resetInput({
      completed_week_number: 1,
      history: {
        full_weeks_under_current_prescription: 1,
        continuous_deficit_weeks: 10,
        prior_calorie_reductions: 2,
      },
    })
    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(result.calorie_reset.status).toBe(
      'eligible',
    )
    expect(
      action(result, 'calorie_reset_increase_100')
        ?.blocker_codes,
    ).toContain('FIRST_TWO_WEEKS_OBSERVATION')
  })

  test('two prior calorie reductions are the minimum reset intervention history', () => {
    const policyInput = resetInput()
    policyInput.history = {
      ...policyInput.history,
      prior_calorie_reductions: 1,
    }

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      result.calorie_reset.criteria
        .prior_calorie_reductions,
    ).toBe(false)
  })

  test('reset requires cardio to be addressed first', () => {
    const policyInput = resetInput()
    policyInput.current_prescription = {
      ...policyInput.current_prescription,
      weekly_cardio_target_minutes: 75,
      cardio_intensity_target: 'easy',
    }

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      result.calorie_reset.criteria.cardio_addressed,
    ).toBe(false)
  })

  test('three-week plateau fails if one week lacks strong adherence', () => {
    const policyInput = resetInput()
    policyInput.recent_weeks = [
      ...policyInput.recent_weeks.slice(0, 2),
      week(10, {
        average_weight_lbs: 160.2,
        nutrition_adherence_percent: 84,
        average_hunger_score: 4,
        cardio_minutes: 90,
      }),
    ]

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      result.calorie_reset.criteria
        .three_week_plateau,
    ).toBe(false)
  })

  test('continued waist progress prevents a three-week plateau finding', () => {
    const policyInput = resetInput()
    policyInput.recent_weeks = [
      week(8, {
        average_weight_lbs: 160.3,
        waist_inches: 32,
      }),
      week(9, {
        average_weight_lbs: 160.25,
        waist_inches: 31.9,
      }),
      week(10, {
        average_weight_lbs: 160.2,
        waist_inches: 31.7,
        average_hunger_score: 4,
        cardio_minutes: 90,
      }),
    ]

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      result.calorie_reset.criteria
        .three_week_plateau,
    ).toBe(false)
  })

  test('continued body-fat progress can support a not-plateau finding but never creates eligibility alone', () => {
    const policyInput = resetInput()
    policyInput.recent_weeks = [
      week(8, {
        average_weight_lbs: 160.3,
        body_fat_percent: 30,
      }),
      week(9, {
        average_weight_lbs: 160.25,
        body_fat_percent: 29.8,
      }),
      week(10, {
        average_weight_lbs: 160.2,
        body_fat_percent: 29.4,
        average_hunger_score: 4,
        cardio_minutes: 90,
      }),
    ]

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      result.calorie_reset.criteria
        .three_week_plateau,
    ).toBe(false)
  })

  test('reset remains blocked without diet fatigue even after a long plateau', () => {
    const policyInput = resetInput()
    policyInput.current_week = week(10, {
      average_weight_lbs: 160.2,
      cardio_minutes: 90,
      average_hunger_score: 2,
      sleep_quality: 4,
      energy_level: 4,
      recovery_score: 4,
    })

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(
      result.calorie_reset.criteria.diet_fatigue,
    ).toBe(false)
    expect(result.calorie_reset.status).toBe(
      'watch',
    )
  })

  test('eight deficit weeks can enter reset watch without becoming eligible', () => {
    const policyInput = resetInput()
    policyInput.history = {
      ...policyInput.history,
      continuous_deficit_weeks: 8,
    }

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(result.calorie_reset.status).toBe(
      'watch',
    )
  })

  test('self-managed nutrition cannot receive an automatic reset prescription', () => {
    const policyInput = resetInput()
    policyInput.current_prescription = {
      ...policyInput.current_prescription,
      nutrition_ownership: 'self_managed',
    }

    const result = evaluateDeterministicPolicy(
      policyInput,
    )

    expect(result.calorie_reset.status).toBe(
      'eligible',
    )
    expect(
      action(result, 'calorie_reset_increase_100')
        ?.blocker_codes,
    ).toContain('NUTRITION_SELF_MANAGED')
  })
})
