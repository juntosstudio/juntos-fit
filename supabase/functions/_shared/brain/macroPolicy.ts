import { POLICY_THRESHOLDS } from './policyConfig.ts'
import type {
  MacroDistributionPreference,
  PolicyPrescription,
} from './policyTypes.ts'

export interface MacroAdjustmentResult {
  legal: boolean
  reason: string | null
  calorie_delta: number
  protein_delta: number
  carb_delta: number
  fat_delta: number
  proposed_prescription: PolicyPrescription | null
}

const MACRO_DELTAS: Record<
  MacroDistributionPreference,
  { carbs: number; fat: number }
> = {
  higher_carb: {
    carbs: 25,
    fat: 0,
  },
  balanced: {
    carbs: 16,
    fat: 4,
  },
  lower_carb: {
    carbs: 7,
    fat: 8,
  },
}

function finiteOrNull(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric)
    ? numeric
    : null
}

function clonePrescription(
  prescription: PolicyPrescription,
): PolicyPrescription {
  return {
    ...prescription,
  }
}

export function applyRoutineCalorieAdjustment({
  prescription,
  direction,
  preference,
  minimumFatGrams = null,
}: {
  prescription: PolicyPrescription
  direction: 'increase' | 'decrease'
  preference: MacroDistributionPreference
  minimumFatGrams?: number | null
}): MacroAdjustmentResult {
  const calories = finiteOrNull(
    prescription.calorie_target,
  )
  const protein = finiteOrNull(
    prescription.protein_grams,
  )
  const carbs = finiteOrNull(
    prescription.carb_grams,
  )
  const fat = finiteOrNull(
    prescription.fat_grams,
  )

  if (
    calories === null ||
    protein === null ||
    carbs === null ||
    fat === null
  ) {
    return {
      legal: false,
      reason:
        'Routine macro adjustment requires complete calorie/protein/carb/fat targets.',
      calorie_delta: 0,
      protein_delta: 0,
      carb_delta: 0,
      fat_delta: 0,
      proposed_prescription: null,
    }
  }

  const preferred = MACRO_DELTAS[preference]
  const sign = direction === 'increase'
    ? 1
    : -1

  let carbDelta = preferred.carbs === 0
    ? 0
    : preferred.carbs * sign
  let fatDelta = preferred.fat === 0
    ? 0
    : preferred.fat * sign

  if (direction === 'decrease') {
    const explicitFatFloor = finiteOrNull(
      minimumFatGrams,
    )

    // Fat is protected. If the data adapter has not supplied an
    // explicit user floor yet, preserve the current fat target and
    // move the full reduction to carbs rather than inventing a floor.
    const normalizedFatFloor =
      explicitFatFloor === null
        ? fat
        : Math.max(0, explicitFatFloor)

    const exactHundredCalorieOptions = {
      higher_carb: [
        { carbs: 25, fat: 0 },
        { carbs: 16, fat: 4 },
        { carbs: 7, fat: 8 },
      ],
      balanced: [
        { carbs: 16, fat: 4 },
        { carbs: 25, fat: 0 },
        { carbs: 7, fat: 8 },
      ],
      lower_carb: [
        { carbs: 7, fat: 8 },
        { carbs: 16, fat: 4 },
        { carbs: 25, fat: 0 },
      ],
    }[preference]

    const available = exactHundredCalorieOptions.find(
      (option) =>
        carbs - option.carbs >= 0 &&
        fat - option.fat >= normalizedFatFloor,
    )

    if (!available) {
      return {
        legal: false,
        reason:
          'The current macros cannot absorb another 100 calorie decrease without crossing a protected macro floor.',
        calorie_delta: 0,
        protein_delta: 0,
        carb_delta: 0,
        fat_delta: 0,
        proposed_prescription: null,
      }
    }

    carbDelta = available.carbs === 0
      ? 0
      : -available.carbs
    fatDelta = available.fat === 0
      ? 0
      : -available.fat
  }

  const calorieDelta =
    sign * POLICY_THRESHOLDS.calorieAdjustment

  const proposed = clonePrescription(
    prescription,
  )

  proposed.calorie_target =
    calories + calorieDelta
  proposed.protein_grams = protein
  proposed.carb_grams = carbs + carbDelta
  proposed.fat_grams = fat + fatDelta

  if (proposed.calorie_target <= 0) {
    return {
      legal: false,
      reason:
        'The proposed calorie target would not be positive.',
      calorie_delta: 0,
      protein_delta: 0,
      carb_delta: 0,
      fat_delta: 0,
      proposed_prescription: null,
    }
  }

  return {
    legal: true,
    reason: null,
    calorie_delta: calorieDelta,
    protein_delta: 0,
    carb_delta: carbDelta,
    fat_delta: fatDelta,
    proposed_prescription: proposed,
  }
}

export function applyCalorieResetIncrease({
  prescription,
}: {
  prescription: PolicyPrescription
}): MacroAdjustmentResult {
  // Calorie Reset is intentionally different from an ordinary
  // preference-based +100. The accepted protocol restores carbs first.
  return applyRoutineCalorieAdjustment({
    prescription,
    direction: 'increase',
    preference: 'higher_carb',
  })
}
