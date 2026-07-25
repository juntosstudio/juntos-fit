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

  const enteredValue = String(value).trim()
  const number = Number(enteredValue)
  const spec = MEASUREMENT_VALIDATION[field]

  if (!Number.isFinite(number) || !spec) {
    return {
      status: 'invalid',
      message:
        'This value can’t be saved. Check the unit ' +
        'or decimal placement and enter it again.',
    }
  }

  // All check-in measurements are recorded to one
  // decimal place. HTML step="0.1" does not reliably
  // reject pasted or manually typed extra decimals.
  if (!/^\d+(?:\.\d)?$/.test(enteredValue)) {
    return {
      status: 'invalid',
      message:
        'Enter no more than one digit after the ' +
        'decimal point.',
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

export const CARDIO_MINUTES_VALIDATION = {
  hard: [0, 600],
  warning: [0, 180],
}

export function getCardioMinutesValidation(
  value,
) {
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

  const enteredValue =
    String(value).trim()

  if (!/^\d+$/.test(enteredValue)) {
    return {
      status: 'invalid',
      message:
        'Enter cardio minutes as a whole number.',
    }
  }

  const minutes = Number(enteredValue)
  const [
    hardMinimum,
    hardMaximum,
  ] = CARDIO_MINUTES_VALIDATION.hard
  const [
    warningMinimum,
    warningMaximum,
  ] = CARDIO_MINUTES_VALIDATION.warning

  if (
    minutes < hardMinimum ||
    minutes > hardMaximum
  ) {
    return {
      status: 'invalid',
      message:
        'Enter cardio minutes between 0 and 600.',
    }
  }

  if (
    minutes < warningMinimum ||
    minutes > warningMaximum
  ) {
    return {
      status: 'warning',
      message:
        'Please double-check this entry. You entered ' +
        `${minutes} minutes of cardio for one day.`,
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

export const CHECKIN_MEASUREMENT_FIELDS = {
  starting_weight_lbs: {
    validationField: 'starting_weight_lbs',
    label: 'Starting weight',
  },
  morning_weight: {
    validationField: 'starting_weight_lbs',
    label: 'Morning weight',
  },
  body_fat_percent: {
    validationField: 'body_fat_percent',
    label: 'Body fat',
  },
  scale_body_fat_percent: {
    validationField: 'body_fat_percent',
    label: 'Body fat',
  },
  neck_inches: {
    validationField: 'neck_inches',
    label: 'Neck',
  },
  chest_inches: {
    validationField: 'chest_inches',
    label: 'Chest',
  },
  waist_inches: {
    validationField: 'waist_inches',
    label: 'Waist',
  },
  hips_inches: {
    validationField: 'hips_inches',
    label: 'Hips',
  },
  upper_arm_inches: {
    validationField: 'upper_arm_inches',
    label: 'Upper arm',
  },
  bicep_inches: {
    validationField: 'upper_arm_inches',
    label: 'Bicep',
  },
  thigh_inches: {
    validationField: 'thigh_inches',
    label: 'Thigh',
  },
  calf_inches: {
    validationField: 'calf_inches',
    label: 'Calf',
  },
  cardio_minutes: {
    validationField: 'cardio_minutes',
    label: 'Cardio',
    validationType: 'cardio',
  },
}

export const START_VALIDATED_MEASUREMENT_FIELDS = [
  'starting_weight_lbs',
  'body_fat_percent',
  'neck_inches',
  'chest_inches',
  'waist_inches',
  'hips_inches',
  'upper_arm_inches',
  'thigh_inches',
  'calf_inches',
]

export const DAILY_VALIDATED_MEASUREMENT_FIELDS = [
  'morning_weight',
  'cardio_minutes',
]

export const WEEKLY_VALIDATED_MEASUREMENT_FIELDS = [
  'morning_weight',
  'scale_body_fat_percent',
  'neck_inches',
  'waist_inches',
  'hips_inches',
  'bicep_inches',
  'thigh_inches',
  'calf_inches',
  'cardio_minutes',
]

export function getCheckInMeasurementValidation({
  formField,
  value,
  unitSystem,
  label,
}) {
  const config =
    CHECKIN_MEASUREMENT_FIELDS[formField]

  if (!config) {
    return {
      status: 'invalid',
      message:
        'This value can’t be validated because its ' +
        'measurement rule is missing.',
    }
  }

  if (
    config.validationType === 'cardio'
  ) {
    return getCardioMinutesValidation(
      value,
    )
  }

  return getMeasurementValidation({
    field: config.validationField,
    value,
    unitSystem,
    label: label || config.label,
  })
}

export function getCheckInWarningConfirmationKey({
  formField,
  value,
  unitSystem,
}) {
  const config =
    CHECKIN_MEASUREMENT_FIELDS[formField]

  if (
    config?.validationType === 'cardio'
  ) {
    return [
      'cardio_minutes',
      Number(value).toString(),
    ].join(':')
  }

  return getWarningConfirmationKey({
    field:
      config?.validationField || formField,
    value,
    unitSystem,
  })
}

export function canContinueMeasurementFields(
  fields,
  validationByField,
) {
  return fields.every((field) => {
    const validation =
      validationByField[field]

    return (
      validation &&
      !['unanswered', 'invalid'].includes(
        validation.status,
      )
    )
  })
}

export function getFirstInvalidMeasurementMessage({
  form,
  fields,
  unitSystem,
  labels = {},
}) {
  for (const field of fields) {
    const validation =
      getCheckInMeasurementValidation({
        formField: field,
        value: form[field],
        unitSystem,
        label: labels[field],
      })

    if (validation.status === 'invalid') {
      return validation.message
    }
  }

  return ''
}
