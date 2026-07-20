import {
  fromCanonicalMeasurement,
  getMeasurementUnit,
  toCanonicalMeasurement,
} from './measurementUnits'

export const MEASUREMENT_VALIDATION = {
  starting_weight_lbs: {
    label: 'Starting weight',
    hard: [40, 1000],
    warning: [75, 700],
  },
  body_fat_percent: {
    label: 'Body fat',
    hard: [1, 85],
    warning: [3, 70],
  },
  neck_inches: {
    label: 'Neck',
    hard: [6, 35],
    warning: [9, 25],
  },
  chest_inches: {
    label: 'Chest',
    hard: [15, 100],
    warning: [24, 70],
  },
  waist_inches: {
    label: 'Waist',
    hard: [12, 120],
    warning: [18, 80],
  },
  hips_inches: {
    label: 'Hips',
    hard: [15, 120],
    warning: [24, 80],
  },
  upper_arm_inches: {
    label: 'Upper arm',
    hard: [3, 45],
    warning: [6, 30],
  },
  thigh_inches: {
    label: 'Thigh',
    hard: [6, 60],
    warning: [12, 40],
  },
  calf_inches: {
    label: 'Calf',
    hard: [4, 40],
    warning: [7, 25],
  },
}

function displayBoundary(
  field,
  canonicalValue,
  unitSystem,
) {
  return fromCanonicalMeasurement(
    field,
    canonicalValue,
    unitSystem,
  )
}

export function getMeasurementValidation({
  field,
  value,
  unitSystem,
  label,
}) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return {
      status: 'unanswered',
      message: '',
    }
  }

  const number = Number(value)
  const spec = MEASUREMENT_VALIDATION[field]

  if (!Number.isFinite(number) || !spec) {
    return {
      status: 'invalid',
      message:
        'This value can’t be saved. Check the unit ' +
        'or decimal placement and enter it again.',
    }
  }

  const canonicalValue =
    toCanonicalMeasurement(
      field,
      number,
      unitSystem,
    )

  const [hardMinimum, hardMaximum] = spec.hard
  const [warningMinimum, warningMaximum] =
    spec.warning
  const fieldLabel = label || spec.label
  const unit = getMeasurementUnit(
    field,
    unitSystem,
  )

  if (
    canonicalValue < hardMinimum ||
    canonicalValue > hardMaximum
  ) {
    const minimum = displayBoundary(
      field,
      hardMinimum,
      unitSystem,
    )
    const maximum = displayBoundary(
      field,
      hardMaximum,
      unitSystem,
    )

    return {
      status: 'invalid',
      message:
        'This value can’t be saved. Enter a value ' +
        `between ${minimum} and ${maximum} ${unit}.`,
    }
  }

  if (
    canonicalValue < warningMinimum ||
    canonicalValue > warningMaximum
  ) {
    return {
      status: 'warning',
      message:
        'Please double-check this entry. You entered ' +
        `${number.toFixed(1)} ${unit} for ${fieldLabel}. ` +
        'Check the measurement unit and decimal placement.',
    }
  }

  return {
    status: 'valid',
    message: '',
  }
}

export function getWarningConfirmationKey({
  field,
  value,
  unitSystem,
}) {
  return [
    field,
    unitSystem,
    Number(value).toString(),
  ].join(':')
}
