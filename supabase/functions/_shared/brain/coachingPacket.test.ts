import {
  describe,
  expect,
  test,
} from 'vitest'

import { buildCoachingPacket } from './coachingPacket.ts'
import { buildDeterministicPolicyInput } from './policyInputAdapter.ts'

class MockQuery {
  table: string
  rows: any[]
  filters: Array<
    (row: any) => boolean
  > = []
  orderField: string | null = null
  orderAscending = true

  constructor(table: string, rows: any[]) {
    this.table = table
    this.rows = rows
  }

  select(_fields: string) {
    return this
  }

  eq(field: string, value: unknown) {
    this.filters.push(
      (row) => row?.[field] === value,
    )
    return this
  }

  gte(field: string, value: unknown) {
    this.filters.push(
      (row) => row?.[field] >= value,
    )
    return this
  }

  lte(field: string, value: unknown) {
    this.filters.push(
      (row) => row?.[field] <= value,
    )
    return this
  }

  in(field: string, values: unknown[]) {
    this.filters.push(
      (row) => values.includes(row?.[field]),
    )
    return this
  }

  order(
    field: string,
    options: { ascending?: boolean } = {},
  ) {
    this.orderField = field
    this.orderAscending =
      options.ascending !== false
    return this
  }

  materialize() {
    let data = this.rows.filter((row) =>
      this.filters.every((filter) =>
        filter(row),
      ),
    )

    if (this.orderField) {
      const field = this.orderField
      const direction = this.orderAscending
        ? 1
        : -1

      data = [...data].sort((a, b) => {
        const left = a?.[field]
        const right = b?.[field]

        if (left === right) {
          return 0
        }

        return left < right
          ? -1 * direction
          : 1 * direction
      })
    }

    return data
  }

  async single() {
    const data = this.materialize()

    if (data.length !== 1) {
      return {
        data: null,
        error: new Error(
          `${this.table} expected one row, found ${data.length}`,
        ),
      }
    }

    return {
      data: data[0],
      error: null,
    }
  }

  async maybeSingle() {
    const data = this.materialize()

    if (data.length > 1) {
      return {
        data: null,
        error: new Error(
          `${this.table} expected zero or one row, found ${data.length}`,
        ),
      }
    }

    return {
      data: data[0] ?? null,
      error: null,
    }
  }

  then(
    resolve: (value: any) => unknown,
    reject?: (reason: unknown) => unknown,
  ) {
    return Promise.resolve({
      data: this.materialize(),
      error: null,
    }).then(resolve, reject)
  }
}

function mockAdmin(
  data: Record<string, any[]>,
) {
  return {
    from(table: string) {
      return new MockQuery(
        table,
        data[table] ?? [],
      )
    },
  }
}

function dailyRow(
  checkinDate: string,
  weight: number,
) {
  return {
    id: `daily-${checkinDate}`,
    coaching_plan_id: 'plan-1',
    checkin_date: checkinDate,
    review_date: checkinDate,
    morning_weight: weight,
    weight_status: 'provided',
    meal_plan_score: 5,
    meal_plan_deviation_details: null,
    planned_cheat_meal_status: 'not_eaten',
    hunger_score: 2,
    water_goal_met: true,
    workout_status: 'completed',
    workout_incomplete_reason: null,
    training_problem: false,
    training_problem_details: null,
    cardio_minutes: 10,
    cardio_type: 'walk',
    cardio_intensity: 'easy',
    alcohol_consumed: false,
    alcohol_details: null,
    additional_notes: null,
    questions_for_coach: null,
  }
}

describe('coaching packet deterministic-policy data path', () => {
  test('selects and preserves BB prescription metadata and intake context', async () => {
    const dailyDates = [
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ]

    const admin = mockAdmin({
      coaching_plans: [
        {
          id: 'plan-1',
          user_id: 'user-1',
          start_date: '2026-08-02',
          checkin_day: 0,
          program_length_weeks: 12,
          goal: 'fat_loss',
          status: 'active',
          end_date: null,
        },
      ],
      profiles: [
        {
          id: 'user-1',
          sex: 'female',
          date_of_birth: '1977-03-23',
        },
      ],
      user_settings: [
        {
          user_id: 'user-1',
          track_water: true,
          track_alcohol: true,
          body_fat_source: 'scale',
          macro_distribution_preference:
            'higher_carb',
        },
      ],
      start_checkins: [
        {
          coaching_plan_id: 'plan-1',
          starting_weight_lbs: 162,
          neck_inches: 14,
          chest_inches: 37,
          waist_inches: 32.5,
          hips_inches: 38.5,
          upper_arm_inches: 11,
          thigh_inches: 22.3,
          calf_inches: 14.5,
          body_fat_percent: 31,
          body_fat_status: 'provided',
          body_fat_method: 'scale',
          body_fat_formula_version: null,
          pre_plan_deficit_weeks: 6,
          status: 'completed',
          completed_at:
            '2026-08-02T12:00:00Z',
        },
      ],
      coaching_plan_targets: [
        {
          id: 'target-a',
          coaching_plan_id: 'plan-1',
          effective_date: '2026-08-02',
          calorie_target: 1700,
          protein_grams: 165,
          carb_grams: 125,
          fat_grams: 60,
          weekly_cardio_target_minutes: 60,
          weekly_workout_target: 3,
          daily_water_goal_oz: 80,
          nutrition_ownership:
            'self_managed',
          prescription_source:
            'initial_plan',
          cardio_intensity_target:
            'moderate',
        },
      ],
      weekly_plan_prescriptions: [
        {
          weekly_checkin_id: 'weekly-1',
          source_target_id: 'target-a',
          week_number: 1,
          effective_from: '2026-08-02',
          effective_to: '2026-08-08',
          days_in_effect: 7,
          calorie_target: 1700,
          protein_grams: 165,
          carb_grams: 125,
          fat_grams: 60,
          weekly_cardio_target_minutes: 60,
          weekly_workout_target: 3,
          daily_water_goal_oz: 80,
          nutrition_ownership:
            'self_managed',
          prescription_source: 'legacy',
          cardio_intensity_target:
            'moderate',
        },
        {
          weekly_checkin_id: 'weekly-2',
          source_target_id: 'target-a',
          week_number: 2,
          effective_from: '2026-08-09',
          effective_to: '2026-08-15',
          days_in_effect: 7,
          calorie_target: 1700,
          protein_grams: 165,
          carb_grams: 125,
          fat_grams: 60,
          weekly_cardio_target_minutes: 60,
          weekly_workout_target: 3,
          daily_water_goal_oz: 80,
          nutrition_ownership:
            'self_managed',
          prescription_source: 'legacy',
          cardio_intensity_target:
            'moderate',
        },
        {
          weekly_checkin_id: 'weekly-3',
          source_target_id: 'target-a',
          week_number: 3,
          effective_from: '2026-08-16',
          effective_to: '2026-08-22',
          days_in_effect: 7,
          calorie_target: 1700,
          protein_grams: 165,
          carb_grams: 125,
          fat_grams: 60,
          weekly_cardio_target_minutes: 60,
          weekly_workout_target: 3,
          daily_water_goal_oz: 80,
          nutrition_ownership:
            'self_managed',
          prescription_source:
            'initial_plan',
          cardio_intensity_target:
            'moderate',
        },
      ],
      weekly_checkins: [
        {
          id: 'weekly-1',
          coaching_plan_id: 'plan-1',
          week_number: 1,
          status: 'completed',
          waist: 32.4,
          body_fat_percent: 30.8,
          body_fat_source: 'scale',
          body_fat_method: 'scale',
          sleep_quality: 4,
          energy_level: 4,
          recovery_score: 4,
          stress_level: 2,
          menstrual_cycle_context: null,
          weekly_reflection: null,
          nutrition_adherence_percent: 100,
          nutrition_adherence_days_reported: 7,
          nutrition_adherence_expected_days: 7,
          nutrition_adherence_coverage_percent: 100,
          nutrition_adherence_policy_version:
            'meal_plan_self_report_v1',
        },
        {
          id: 'weekly-2',
          coaching_plan_id: 'plan-1',
          week_number: 2,
          status: 'completed',
          waist: 32.2,
          body_fat_percent: 30.5,
          body_fat_source: 'scale',
          body_fat_method: 'scale',
          sleep_quality: 4,
          energy_level: 4,
          recovery_score: 4,
          stress_level: 2,
          menstrual_cycle_context: null,
          weekly_reflection: null,
          nutrition_adherence_percent: 100,
          nutrition_adherence_days_reported: 7,
          nutrition_adherence_expected_days: 7,
          nutrition_adherence_coverage_percent: 100,
          nutrition_adherence_policy_version:
            'meal_plan_self_report_v1',
        },
      ],
      daily_checkins: dailyDates.map(
        (date, index) =>
          dailyRow(date, 162 - index * 0.1),
      ),
    })

    const weeklyCheckIn = {
      id: 'weekly-3',
      coaching_plan_id: 'plan-1',
      checkin_date: '2026-08-23',
      week_number: 3,
      status: 'completed',
      submitted_at: '2026-08-23T12:00:00Z',
      updated_at: '2026-08-23T12:00:00Z',
      neck: 13.2,
      chest: 36,
      waist: 32,
      hips: 38.5,
      right_arm: null,
      left_arm: 10.2,
      right_thigh: null,
      left_thigh: 21.5,
      right_calf: null,
      left_calf: 14.2,
      measurement_side: 'left',
      body_fat_percent: 30,
      body_fat_source: 'scale',
      body_fat_method: 'scale',
      sleep_quality: 4,
      energy_level: 4,
      recovery_score: 4,
      stress_level: 2,
      menstrual_cycle_context: null,
      weekly_reflection: 'Good week.',
      questions_for_coach: null,
      nutrition_adherence_percent: 100,
      nutrition_adherence_days_reported: 7,
      nutrition_adherence_expected_days: 7,
      nutrition_adherence_coverage_percent: 100,
      nutrition_adherence_policy_version:
        'meal_plan_self_report_v1',
    }

    const packet = await buildCoachingPacket({
      admin,
      weeklyCheckIn,
    })

    expect(
      packet.tracking_settings
        .macro_distribution_preference,
    ).toBe('higher_carb')
    expect(
      packet.baseline.pre_plan_deficit_weeks,
    ).toBe(6)
    expect(packet.baseline).toMatchObject({
      starting_neck_inches: 14,
      starting_chest_inches: 37,
      starting_waist_inches: 32.5,
      starting_hips_inches: 38.5,
      starting_arm_inches: 11,
      starting_thigh_inches: 22.3,
      starting_calf_inches: 14.5,
    })
    expect(
      packet.current_week.outcomes.full_measurements,
    ).toEqual({
      measurement_side: 'left',
      neck_inches: 13.2,
      chest_inches: 36,
      waist_inches: 32,
      hips_inches: 38.5,
      arm_inches: 10.2,
      thigh_inches: 21.5,
      calf_inches: 14.2,
    })
    expect(
      packet.current_week.outcomes.plan_start_progress,
    ).toMatchObject({
      neck_change_inches: -0.8,
      chest_change_inches: -1,
      waist_change_inches: -0.5,
      hips_change_inches: 0,
      arm_change_inches: -0.8,
      thigh_change_inches: -0.8,
      calf_change_inches: -0.3,
      body_fat_change_points: -1,
    })

    expect(
      packet.current_week.prescription[0],
    ).toMatchObject({
      source_target_id: 'target-a',
      nutrition_ownership: 'self_managed',
      prescription_source: 'initial_plan',
      cardio_intensity_target: 'moderate',
    })
    expect(
      packet.history[0].prescription[0],
    ).toMatchObject({
      source_target_id: 'target-a',
      nutrition_ownership: 'self_managed',
      prescription_source: 'legacy',
      cardio_intensity_target: 'moderate',
    })
    expect(packet.prescription_history).toEqual([
      expect.objectContaining({
        id: 'target-a',
        effective_date: '2026-08-02',
        nutrition_ownership: 'self_managed',
        prescription_source: 'initial_plan',
        cardio_intensity_target: 'moderate',
      }),
    ])

    const policyInput =
      buildDeterministicPolicyInput(packet)

    expect(
      policyInput.macro_distribution_preference,
    ).toBe('higher_carb')
    expect(
      policyInput.current_prescription
        .nutrition_ownership,
    ).toBe('self_managed')
    expect(
      policyInput.current_prescription
        .cardio_intensity_target,
    ).toBe('moderate')
    expect(
      policyInput.history
        .full_weeks_under_current_prescription,
    ).toBe(3)
    expect(
      policyInput.history.continuous_deficit_weeks,
    ).toBe(9)
  })
})
