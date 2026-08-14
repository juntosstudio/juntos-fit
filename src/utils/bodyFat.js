export const BODY_FAT_FORMULA_VERSION =
  'deurenberg_adult_v1'

function calculateAge(dateOfBirth, asOfDate) {
  const birthDate = new Date(
    `${dateOfBirth}T00:00:00Z`,
  )
  const comparisonDate = new Date(
    `${asOfDate}T00:00:00Z`,
  )

  if (
    Number.isNaN(birthDate.getTime()) ||
    Number.isNaN(comparisonDate.getTime())
  ) {
    return null
  }

  let age =
    comparisonDate.getUTCFullYear() -
    birthDate.getUTCFullYear()

  const monthDifference =
    comparisonDate.getUTCMonth() -
    birthDate.getUTCMonth()

  const birthdayHasNotOccurred =
    monthDifference < 0 ||
    (monthDifference === 0 &&
      comparisonDate.getUTCDate() <
        birthDate.getUTCDate())

  if (birthdayHasNotOccurred) {
    age -= 1
  }

  return age
}

// Calculates the adult BMI/age/sex estimate used by Juntos Fit V1.
export function calculateJuntosBodyFatEstimate({
  weightLbs,
  heightCm,
  dateOfBirth,
  sex,
  asOfDate,
}) {
  const weight = Number(weightLbs)
  const height = Number(heightCm)
  const age = calculateAge(
    dateOfBirth,
    asOfDate,
  )

  if (
    !Number.isFinite(weight) ||
    weight <= 0 ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isInteger(age) ||
    age < 18 ||
    !['male', 'female'].includes(sex)
  ) {
    return null
  }

  const weightKg = weight * 0.45359237
  const heightMeters = height / 100
  const bmi =
    weightKg / heightMeters ** 2
  const sexValue = sex === 'male' ? 1 : 0

  const estimate =
    1.2 * bmi +
    0.23 * age -
    10.8 * sexValue -
    5.4

  return {
    percent:
      Math.round(estimate * 10) / 10,
    formulaVersion:
      BODY_FAT_FORMULA_VERSION,
  }
}

export const RFM_BODY_FAT_FORMULA_VERSION =
  'rfm_v1'

// Relative Fat Mass (RFM) for adults.
// Formula: 64 - 20 * (height / waist) + 12 * sex
// where sex is 0 for male and 1 for female, and
// height and waist use the same units.
export function calculateRfmBodyFatEstimate({
  waistInches,
  heightCm,
  sex,
}) {
  const waist = Number(waistInches)
  const height = Number(heightCm)

  if (
    !Number.isFinite(waist) ||
    waist <= 0 ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !['male', 'female'].includes(sex)
  ) {
    return null
  }

  const waistCm = waist * 2.54
  const sexValue = sex === 'female' ? 1 : 0

  const estimate =
    64 -
    20 * (height / waistCm) +
    12 * sexValue

  if (!Number.isFinite(estimate)) {
    return null
  }

  return {
    percent:
      Math.round(estimate * 10) / 10,
    formulaVersion:
      RFM_BODY_FAT_FORMULA_VERSION,
  }
}

