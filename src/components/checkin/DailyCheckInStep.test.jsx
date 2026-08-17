// @vitest-environment jsdom

import React from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

vi.mock('../wizard', () => ({
  WizardQuestion: ({
    title,
    helper,
    children,
  }) => (
    <section>
      <h2>{title}</h2>
      {helper && <div>{helper}</div>}
      {children}
    </section>
  ),
  WizardNumberField: ({
    label,
    value,
    onChange,
  }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
    />
  ),
  WizardChoiceGroup: ({
    options,
    onChange,
  }) => (
    <div>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() =>
            onChange(option.value)
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
  WizardSlider: () => null,
  WizardTextarea: () => null,
}))

vi.mock(
  './questions/WeightQuestion',
  () => ({
    WeightQuestion: () => null,
  }),
)

import {
  DailyCheckInStep,
} from './DailyCheckInStep'

afterEach(() => {
  cleanup()
})

function renderCardio(
  form,
  setField = vi.fn(),
) {
  return {
    setField,
    ...render(
      <DailyCheckInStep
        step="cardio"
        form={form}
        setField={setField}
        target={{
          weekly_cardio_target_minutes: 90,
        }}
        cardioCompleted={30}
      />,
    ),
  }
}

describe('DailyCheckInStep cardio context', () => {
  test('keeps cardio type and effort hidden at zero minutes', () => {
    renderCardio({
      cardio_minutes: '0',
      cardio_type: '',
      cardio_intensity: '',
    })

    expect(
      screen.queryByRole('combobox', {
        name: 'Cardio type',
      }),
    ).toBeNull()
  })

  test('shows cardio type dropdown and effort choices for positive minutes', () => {
    renderCardio({
      cardio_minutes: '20',
      cardio_type: 'walking',
      cardio_intensity: 'moderate',
    })

    expect(
      screen.getByRole('combobox', {
        name: 'Cardio type',
      }).value,
    ).toBe('walking')

    expect(
      screen.getByRole('radio', {
        name: 'Easy',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('radio', {
        name: 'Moderate',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('radio', {
        name: 'Hard',
      }),
    ).toBeTruthy()
  })

  test('passes cardio type and effort changes to the form setter', () => {
    const setField = vi.fn()

    renderCardio(
      {
        cardio_minutes: '20',
        cardio_type: '',
        cardio_intensity: '',
      },
      setField,
    )

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Cardio type',
      }),
      {
        target: {
          value: 'hiit_intervals',
        },
      },
    )

    fireEvent.click(
      screen.getByRole('radio', {
        name: 'Hard',
      }),
    )

    expect(setField).toHaveBeenCalledWith(
      'cardio_type',
      'hiit_intervals',
    )
    expect(setField).toHaveBeenCalledWith(
      'cardio_intensity',
      'hard',
    )
  })
})
