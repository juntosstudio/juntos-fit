import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  getWizardFieldState,
  isWizardAnswerEmpty,
  joinWizardClasses,
} from './wizardFieldState'

describe('Wizard answer emptiness', () => {
  test.each([
    null,
    undefined,
    '',
    '   ',
    [],
  ])(
    'treats %o as empty',
    (value) => {
      expect(
        isWizardAnswerEmpty(value),
      ).toBe(true)
    },
  )

  test.each([
    false,
    true,
    0,
    1,
    '0',
    'answer',
    ['answer'],
    {},
  ])(
    'treats %o as answered',
    (value) => {
      expect(
        isWizardAnswerEmpty(value),
      ).toBe(false)
    },
  )
})

describe('Wizard field visual state', () => {
  test('invalid has highest priority', () => {
    expect(
      getWizardFieldState({
        value: 'answer',
        invalid: true,
        warning: true,
        optional: true,
      }),
    ).toBe('is-invalid')
  })

  test('warning takes priority over answered and optional', () => {
    expect(
      getWizardFieldState({
        value: 'answer',
        warning: true,
        optional: true,
      }),
    ).toBe('is-warning')
  })

  test('returns has-answer for a normal answer', () => {
    expect(
      getWizardFieldState({
        value: 'answer',
      }),
    ).toBe('has-answer')
  })

  test('treats boolean false as an answer', () => {
    expect(
      getWizardFieldState({
        value: false,
      }),
    ).toBe('has-answer')
  })

  test('treats numeric zero as an answer', () => {
    expect(
      getWizardFieldState({
        value: 0,
      }),
    ).toBe('has-answer')
  })

  test('uses explicit answered=true even with an empty value', () => {
    expect(
      getWizardFieldState({
        value: '',
        answered: true,
      }),
    ).toBe('has-answer')
  })

  test('uses explicit answered=false even with a non-empty value', () => {
    expect(
      getWizardFieldState({
        value: 'answer',
        answered: false,
      }),
    ).toBe('needs-answer')
  })

  test('returns optional for an unanswered optional field', () => {
    expect(
      getWizardFieldState({
        value: '',
        optional: true,
      }),
    ).toBe('is-optional')
  })

  test('returns needs-answer for an unanswered required field', () => {
    expect(
      getWizardFieldState({
        value: '',
      }),
    ).toBe('needs-answer')
  })
})

describe('Wizard class joining', () => {
  test('joins truthy class names with spaces', () => {
    expect(
      joinWizardClasses(
        'wizard-field',
        'has-answer',
        'wide',
      ),
    ).toBe(
      'wizard-field has-answer wide',
    )
  })

  test('drops falsey class names', () => {
    expect(
      joinWizardClasses(
        'wizard-field',
        '',
        null,
        undefined,
        false,
        'has-answer',
      ),
    ).toBe(
      'wizard-field has-answer',
    )
  })

  test('returns an empty string when no class names are supplied', () => {
    expect(
      joinWizardClasses(),
    ).toBe('')
  })
})
