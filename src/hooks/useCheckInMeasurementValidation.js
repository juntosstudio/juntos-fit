import {
  useMemo,
  useState,
} from 'react'
import {
  getCheckInMeasurementValidation,
  getCheckInWarningConfirmationKey,
} from '../utils/measurementValidation'

// Shares validation, warning confirmation, and display state
// across Start, Daily, and Weekly check-in measurements.
export function useCheckInMeasurementValidation({
  form,
  fields,
  unitSystem,
  labels = {},
  inputIds = {},
}) {
  const [
    confirmedWarningKeys,
    setConfirmedWarningKeys,
  ] = useState(() => new Set())
  const [
    warningConfirmation,
    setWarningConfirmation,
  ] = useState(null)

  const rawValidationByField =
    useMemo(
      () =>
        Object.fromEntries(
          fields.map((field) => [
            field,
            getCheckInMeasurementValidation({
              formField: field,
              value: form[field],
              unitSystem,
              label: labels[field],
            }),
          ]),
        ),
      [
        fields,
        form,
        labels,
        unitSystem,
      ],
    )

  const validationByField =
    useMemo(
      () =>
        Object.fromEntries(
          fields.map((field) => {
            const rawValidation =
              rawValidationByField[field]
            const warningKey =
              getCheckInWarningConfirmationKey({
                formField: field,
                value: form[field],
                unitSystem,
              })

            const validation =
              rawValidation.status ===
                'warning' &&
              confirmedWarningKeys.has(
                warningKey,
              )
                ? {
                    status: 'valid',
                    message: '',
                  }
                : rawValidation

            const showMessage =
              ['invalid', 'warning'].includes(
                validation.status,
              )

            return [
              field,
              {
                ...validation,
                message: showMessage
                  ? validation.message
                  : '',
                displayState:
                  validation.status ===
                  'invalid'
                    ? 'is-invalid'
                    : validation.status ===
                        'warning'
                      ? 'is-warning'
                      : undefined,
              },
            ]
          }),
        ),
      [
        confirmedWarningKeys,
        fields,
        form,
        rawValidationByField,
        unitSystem,
      ],
    )

  function getUnconfirmedWarnings(
    activeFields,
  ) {
    return activeFields
      .map((field) => {
        const validation =
          rawValidationByField[field]
        const key =
          getCheckInWarningConfirmationKey({
            formField: field,
            value: form[field],
            unitSystem,
          })

        return {
          field,
          inputId: inputIds[field],
          key,
          validation,
        }
      })
      .filter(
        (item) =>
          item.validation?.status ===
            'warning' &&
          !confirmedWarningKeys.has(
            item.key,
          ),
      )
  }

  function requestWarningConfirmation(
    activeFields,
  ) {
    const warnings =
      getUnconfirmedWarnings(activeFields)

    if (warnings.length === 0) {
      return false
    }

    setWarningConfirmation({ warnings })
    return true
  }

  function confirmWarningValues() {
    const keys =
      warningConfirmation
        ?.warnings?.map(
          (warning) => warning.key,
        ) ?? []

    setConfirmedWarningKeys(
      (current) =>
        new Set([
          ...current,
          ...keys,
        ]),
    )
    setWarningConfirmation(null)
  }

  function cancelWarningConfirmation() {
    setWarningConfirmation(null)
  }

  function resetWarningConfirmations() {
    setConfirmedWarningKeys(
      new Set(),
    )
    setWarningConfirmation(null)
  }

  return {
    rawValidationByField,
    validationByField,
    warningConfirmation,
    requestWarningConfirmation,
    confirmWarningValues,
    cancelWarningConfirmation,
    resetWarningConfirmations,
  }
}
