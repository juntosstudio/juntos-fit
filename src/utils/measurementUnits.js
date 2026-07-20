export const UNIT_SYSTEM_OPTIONS = [
  {
    value: 'imperial',
    label: 'Imperial — pounds and inches',
  },
  {
    value: 'metric',
    label: 'Metric — kilograms and centimeters',
  },
]

const WEIGHT_FIELDS = new Set([
  'starting_weight_lbs',
])

const CIRCUMFERENCE_FIELDS = new Set([
  'neck_inches',
  'chest_inches',
  'waist_inches',
  'hips_inches',
  'upper_arm_inches',
  'thigh_inches',
  'calf_inches',
])

function round(value, decimalPlaces = 2) {
  const factor = 10 ** decimalPlaces

  return (
    Math.round((value + Number.EPSILON) * factor) /
    factor
  )
}

export function normalizeUnitSystem(value) {
  return value === 'metric'
    ? 'metric'
    : 'imperial'
}

export function getMeasurementUnit(
  field,
  unitSystem,
) {
  const system = normalizeUnitSystem(unitSystem)

  if (field === 'body_fat_percent') {
    return '%'
  }

  if (WEIGHT_FIELDS.has(field)) {
    return system === 'metric' ? 'kg' : 'lbs'
  }

  if (CIRCUMFERENCE_FIELDS.has(field)) {
    return system === 'metric' ? 'cm' : 'in'
  }

  return ''
}

// Converts a displayed value into the database's pounds/inches format.
export function toCanonicalMeasurement(
  field,
  displayValue,
  unitSystem,
) {
  if (
    displayValue === '' ||
    displayValue === null ||
    displayValue === undefined
  ) {
    return null
  }

  const value = Number(displayValue)

  if (!Number.isFinite(value)) {
    return null
  }

  const system = normalizeUnitSystem(unitSystem)

  if (
    system === 'metric' &&
    WEIGHT_FIELDS.has(field)
  ) {
    return round(value * 2.2046226218)
  }

  if (
    system === 'metric' &&
    CIRCUMFERENCE_FIELDS.has(field)
  ) {
    return round(value / 2.54)
  }

  return round(value)
}

// Converts a saved pounds/inches value into the user's display unit.
export function fromCanonicalMeasurement(
  field,
  canonicalValue,
  unitSystem,
) {
  if (
    canonicalValue === '' ||
    canonicalValue === null ||
    canonicalValue === undefined
  ) {
    return ''
  }

  const value = Number(canonicalValue)

  if (!Number.isFinite(value)) {
    return ''
  }

  const system = normalizeUnitSystem(unitSystem)
  let displayValue = value

  if (
    system === 'metric' &&
    WEIGHT_FIELDS.has(field)
  ) {
    displayValue = value / 2.2046226218
  }

  if (
    system === 'metric' &&
    CIRCUMFERENCE_FIELDS.has(field)
  ) {
    displayValue = value * 2.54
  }

  return round(displayValue, 1).toFixed(1)
}

export function formatMeasurementValue(
  field,
  displayValue,
  unitSystem,
) {
  if (
    displayValue === '' ||
    displayValue === null ||
    displayValue === undefined
  ) {
    return 'Not entered'
  }

  const value = Number(displayValue)

  if (!Number.isFinite(value)) {
    return 'Not entered'
  }

  return `${value.toFixed(1)} ${getMeasurementUnit(
    field,
    unitSystem,
  )}`
}
