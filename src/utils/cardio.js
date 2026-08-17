export const CARDIO_TYPE_OPTIONS = [
  {
    value: 'walking',
    label: 'Walking',
  },
  {
    value: 'running_jogging',
    label: 'Running / Jogging',
  },
  {
    value: 'hiit_intervals',
    label: 'HIIT / Intervals',
  },
  {
    value: 'stair_stepper',
    label: 'StairMaster / Step Machine',
  },
  {
    value: 'cycling',
    label: 'Cycling',
  },
  {
    value: 'elliptical_rowing',
    label: 'Elliptical / Rowing',
  },
  {
    value: 'mixed',
    label: 'Mixed',
  },
  {
    value: 'other',
    label: 'Other',
  },
]

export const CARDIO_INTENSITY_OPTIONS = [
  {
    value: 'easy',
    label: 'Easy',
  },
  {
    value: 'moderate',
    label: 'Moderate',
  },
  {
    value: 'hard',
    label: 'Hard',
  },
]

const CARDIO_TYPE_LABELS =
  Object.fromEntries(
    CARDIO_TYPE_OPTIONS.map(
      ({ value, label }) => [
        value,
        label,
      ],
    ),
  )

const CARDIO_INTENSITY_LABELS =
  Object.fromEntries(
    CARDIO_INTENSITY_OPTIONS.map(
      ({ value, label }) => [
        value,
        label,
      ],
    ),
  )

export function isCardioType(value) {
  return Boolean(
    CARDIO_TYPE_LABELS[value],
  )
}

export function isCardioIntensity(value) {
  return Boolean(
    CARDIO_INTENSITY_LABELS[value],
  )
}

export function getCardioTypeLabel(value) {
  return (
    CARDIO_TYPE_LABELS[value] ??
    ''
  )
}

export function getCardioIntensityLabel(value) {
  return (
    CARDIO_INTENSITY_LABELS[value] ??
    ''
  )
}

export function getCardioContextLabel({
  cardioType,
  cardioIntensity,
} = {}) {
  return [
    getCardioTypeLabel(cardioType),
    getCardioIntensityLabel(
      cardioIntensity,
    ),
  ]
    .filter(Boolean)
    .join(' · ')
}
