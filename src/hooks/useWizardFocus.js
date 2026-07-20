
import {
  useCallback,
  useEffect,
  useRef,
} from 'react'

const FOCUSABLE_FIELD_SELECTOR = [
  'input:not([type="radio"])' +
    ':not([type="checkbox"])' +
    ':not([type="range"])' +
    ':not([type="file"])' +
    ':not([type="hidden"])' +
    ':not(:disabled)',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
].join(',')

function moveCaretToEnd(element) {
  const valueLength = String(
    element.value ?? '',
  ).length

  if (
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement &&
      [
        'text',
        'email',
        'password',
        'search',
        'tel',
        'url',
      ].includes(element.type))
  ) {
    element.setSelectionRange(
      valueLength,
      valueLength,
    )
  }
}

function focusElement(
  element,
  {
    selectAll = false,
    preventScroll = true,
  } = {},
) {
  if (!element) {
    return
  }

  element.focus({ preventScroll })

  if (
    selectAll &&
    typeof element.select === 'function'
  ) {
    element.select()
    return
  }

  moveCaretToEnd(element)
}

// Gives every wizard the same forward, back, and edit-focus behavior.
export function useWizardFocus({
  stepKey,
  rootId,
  reviewing = false,
  disabled = false,
}) {
  const navigationIntent = useRef('initial')

  const markForwardNavigation =
    useCallback(() => {
      navigationIntent.current = 'forward'
    }, [])

  const markBackNavigation =
    useCallback(() => {
      navigationIntent.current = 'back'
    }, [])

  const focusField = useCallback(
    (
      fieldId,
      {
        selectAll = true,
        preventScroll = false,
      } = {},
    ) => {
      requestAnimationFrame(() => {
        focusElement(
          document.getElementById(fieldId),
          {
            selectAll,
            preventScroll,
          },
        )
      })
    },
    [],
  )

  useEffect(() => {
    const intent = navigationIntent.current

    navigationIntent.current = 'idle'

    if (
      disabled ||
      reviewing ||
      intent === 'back' ||
      intent === 'idle'
    ) {
      return undefined
    }

    const frame = requestAnimationFrame(() => {
      const root =
        document.getElementById(rootId)

      const firstField = root?.querySelector(
        FOCUSABLE_FIELD_SELECTOR,
      )

      focusElement(firstField, {
        selectAll: false,
        preventScroll: true,
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [
    disabled,
    reviewing,
    rootId,
    stepKey,
  ])

  return {
    markForwardNavigation,
    markBackNavigation,
    focusField,
  }
}
