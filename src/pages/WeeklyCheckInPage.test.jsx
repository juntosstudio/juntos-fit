// @vitest-environment jsdom

import React from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  hookState: {},
  setField: vi.fn(),
  saveDraft: vi.fn(),
  uploadPhoto: vi.fn(),
  submitCheckIn: vi.fn(),
  resetPreview: vi.fn(),
  getWeeklyCheckInSteps: vi.fn(),
  canContinueWeeklyStep: vi.fn(),
  fromWeeklyDailyStep: vi.fn(),
  getWeeklyStepMeasurementFields: vi.fn(),
  getCheckInMeasurementValidation: vi.fn(),
  getCheckInWarningConfirmationKey: vi.fn(),
  normalizeUnitSystem: vi.fn(
    () => 'imperial',
  ),
}))

vi.mock(
  '../hooks/useWeeklyCheckIn',
  () => ({
    useWeeklyCheckIn: vi.fn(
      () => mocks.hookState,
    ),
  }),
)

vi.mock(
  '../utils/dailyCheckInFlow',
  () => ({
    DAILY_CHECKIN_STEP_IDS: {
      WEIGHT: 'weight',
      CARDIO: 'cardio',
    },
  }),
)

vi.mock(
  '../utils/weeklyCheckInFlow',
  () => ({
    WEEKLY_CHECKIN_STEP_IDS: {
      BODY_FAT: 'body_fat',
    },
    getWeeklyCheckInSteps:
      mocks.getWeeklyCheckInSteps,
    canContinueWeeklyStep:
      mocks.canContinueWeeklyStep,
    fromWeeklyDailyStep:
      mocks.fromWeeklyDailyStep,
    getWeeklyStepMeasurementFields:
      mocks.getWeeklyStepMeasurementFields,
  }),
)

vi.mock(
  '../utils/measurementValidation',
  () => ({
    getCheckInMeasurementValidation:
      mocks.getCheckInMeasurementValidation,
    getCheckInWarningConfirmationKey:
      mocks.getCheckInWarningConfirmationKey,
  }),
)

vi.mock(
  '../utils/measurementUnits',
  () => ({
    normalizeUnitSystem:
      mocks.normalizeUnitSystem,
  }),
)

vi.mock(
  '../utils/formatters',
  () => ({
    formatDate: vi.fn(
      (value) => `Formatted ${value}`,
    ),
  }),
)

vi.mock(
  '../components/checkin/WeeklyCheckInStep',
  () => ({
    WeeklyCheckInStep: ({
      step,
      form,
      setField,
      onSkipBodyFat,
    }) => (
      <section data-testid="weekly-step">
        <p>Active step: {step}</p>

        {step === 'weight' && (
          <button
            type="button"
            onClick={() =>
              setField(
                'weight_status',
                'recorded',
              )
            }
          >
            Mock set weight status
          </button>
        )}

        {step === 'body_fat' && (
          <button
            type="button"
            onClick={onSkipBodyFat}
          >
            Skip body fat
          </button>
        )}

        {step === 'cardio' && (
          <input
            id="daily-cardio-minutes"
            aria-label="Weekly cardio minutes"
            defaultValue={
              form.cardio_minutes
            }
          />
        )}
      </section>
    ),
  }),
)

vi.mock(
  '../components/checkin/WeeklyCheckInReview',
  () => ({
    WeeklyCheckInReview: ({
      weekNumber,
    }) => (
      <section data-testid="weekly-review">
        Review week {weekNumber}
      </section>
    ),
  }),
)

import {
  WeeklyCheckInPage,
} from './WeeklyCheckInPage'

afterEach(() => {
  cleanup()
})

function renderPage(props = {}) {
  return render(
    <WeeklyCheckInPage
      plan={{
        id: 'plan-1',
        start_date: '2026-08-02',
        body_fat_source: 'none',
      }}
      profile={{
        sex: 'female',
        unit_system: 'imperial',
      }}
      target={{}}
      cardioCompleted={45}
      settings={{
        user_id: 'user-1',
        body_fat_source: 'none',
        track_water: true,
        track_alcohol: true,
      }}
      onSaved={vi.fn()}
      onBack={vi.fn()}
      {...props}
    />,
  )
}

describe('WeeklyCheckInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.hookState = {
      today: '2026-08-16',
      weekNumber: 2,
      photosRequired: false,
      isFinalWeekly: false,
      persistenceEnabled: true,
      isCompleted: false,
      resumeStep: null,
      form: {
        weight_status: 'recorded',
        morning_weight: '150',
        cardio_minutes: '0',
        body_fat_status: '',
        scale_body_fat_percent: '',
      },
      photos: {},
      estimatedBodyFat: null,
      reviewBodyFatSource: 'none',
      reviewEstimatedBodyFat: null,
      loading: false,
      saving: false,
      uploadingPose: '',
      error: '',
      saveMessage: '',
      setField: mocks.setField,
      saveDraft: mocks.saveDraft,
      uploadPhoto: mocks.uploadPhoto,
      submitCheckIn:
        mocks.submitCheckIn,
      resetPreview:
        mocks.resetPreview,
    }

    mocks.getWeeklyCheckInSteps.mockReturnValue([
      'weight',
      'cardio',
      'body_fat',
      'reflection',
    ])

    mocks.canContinueWeeklyStep.mockReturnValue(
      true,
    )

    mocks.fromWeeklyDailyStep.mockImplementation(
      (step) => {
        if (step === 'weight') return 'weight'
        if (step === 'cardio') return 'cardio'
        return null
      },
    )

    mocks.getWeeklyStepMeasurementFields.mockReturnValue(
      [],
    )

    mocks.getCheckInMeasurementValidation.mockReturnValue({
      status: 'valid',
      message: '',
    })

    mocks.getCheckInWarningConfirmationKey.mockImplementation(
      ({ formField, value }) =>
        `${formField}:${value}`,
    )

    mocks.saveDraft.mockResolvedValue(true)
    mocks.submitCheckIn.mockResolvedValue(true)
  })

  test('shows missing-plan alert', () => {
    renderPage({ plan: null })

    expect(
      screen.getByRole('alert')
        .textContent,
    ).toBe(
      'Create a plan before opening the Weekly Check-In.',
    )
  })

  test('shows loading state', () => {
    mocks.hookState = {
      ...mocks.hookState,
      loading: true,
    }

    renderPage()

    expect(
      screen.getByText(
        'Loading your check-in...',
      ),
    ).toBeTruthy()
  })

  test('starts on first Weekly step with Back disabled', () => {
    renderPage()

    expect(
      screen.getByText(
        'Active step: weight',
      ),
    ).toBeTruthy()

    expect(
      screen.getByRole('button', {
        name: 'Back',
      }).disabled,
    ).toBe(true)
  })

  test('passes Weekly field changes into hook', () => {
    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name:
          'Mock set weight status',
      }),
    )

    expect(
      mocks.setField,
    ).toHaveBeenCalledWith(
      'weight_status',
      'recorded',
    )
  })

  test('persistent Weekly mode shows autosave badge and Save & Exit', () => {
    mocks.hookState = {
      ...mocks.hookState,
      saveMessage: 'Saved',
    }

    renderPage()

    expect(
      screen.getByRole('status')
        .textContent,
    ).toContain('Autosave is on')
    expect(
      screen.getByRole('status')
        .textContent,
    ).toContain('Saved')

    expect(
      screen.getByRole('button', {
        name: 'Save & Exit',
      }),
    ).toBeTruthy()
  })

  test('preview mode shows DEV badge and Back to Dashboard', () => {
    mocks.hookState = {
      ...mocks.hookState,
      persistenceEnabled: false,
    }

    renderPage()

    expect(
      screen.getByText(
        /DEV Preview/,
      ),
    ).toBeTruthy()

    expect(
      screen.getByRole('button', {
        name: 'Back to Dashboard',
      }),
    ).toBeTruthy()
  })

  test('Next autosaves target resume step before advancing', async () => {
    renderPage()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Next',
        }),
      )
    })

    expect(
      mocks.saveDraft,
    ).toHaveBeenCalledWith(
      'cardio',
      mocks.hookState.form,
    )

    expect(
      screen.getByText(
        'Active step: cardio',
      ),
    ).toBeTruthy()
  })

  test('Back autosaves previous resume step before moving backward', async () => {
    renderPage()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Next',
        }),
      )
    })

    mocks.saveDraft.mockClear()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Back',
        }),
      )
    })

    expect(
      mocks.saveDraft,
    ).toHaveBeenCalledWith(
      'weight',
    )

    expect(
      screen.getByText(
        'Active step: weight',
      ),
    ).toBeTruthy()
  })

  test('Save & Exit saves current resume step then calls onSaved and onBack', async () => {
    const onSaved = vi.fn()
    const onBack = vi.fn()

    renderPage({
      onSaved,
      onBack,
    })

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Save & Exit',
        }),
      )
    })

    expect(
      mocks.saveDraft,
    ).toHaveBeenCalledWith(
      'weight',
    )
    expect(onSaved).toHaveBeenCalledOnce()
    expect(onBack).toHaveBeenCalledOnce()
  })

  test('body-fat skip writes no-reading state and advances', async () => {
    mocks.getWeeklyCheckInSteps.mockReturnValue([
      'body_fat',
      'reflection',
    ])

    renderPage()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Skip body fat',
        }),
      )
    })

    expect(
      mocks.setField,
    ).toHaveBeenCalledWith(
      'body_fat_status',
      'no_reading',
    )
    expect(
      mocks.setField,
    ).toHaveBeenCalledWith(
      'scale_body_fat_percent',
      '',
    )

    expect(
      mocks.saveDraft,
    ).toHaveBeenCalledWith(
      'reflection',
      expect.objectContaining({
        body_fat_status:
          'no_reading',
        scale_body_fat_percent: '',
      }),
    )
  })

  test('moves through Weekly wizard into review', async () => {
    renderPage()

    for (let i = 0; i < 4; i += 1) {
      const name =
        i === 3
          ? 'Review Answers'
          : 'Next'

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', {
            name,
          }),
        )
      })
    }

    expect(
      screen.getByRole('heading', {
        name:
          'Review Weekly Check-In',
      }),
    ).toBeTruthy()

    expect(
      screen.getByTestId(
        'weekly-review',
      ),
    ).toBeTruthy()
  })

  test('review Edit Answers saves last step and returns to wizard', async () => {
    renderPage()

    for (let i = 0; i < 4; i += 1) {
      const name =
        i === 3
          ? 'Review Answers'
          : 'Next'

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', {
            name,
          }),
        )
      })
    }

    mocks.saveDraft.mockClear()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Edit Answers',
        }),
      )
    })

    expect(
      mocks.saveDraft,
    ).toHaveBeenCalledWith(
      'reflection',
    )

    expect(
      screen.getByText(
        'Active step: reflection',
      ),
    ).toBeTruthy()
  })

  test('submit calls submitCheckIn and returns to dashboard on success', async () => {
    const onBack = vi.fn()

    renderPage({ onBack })

    for (let i = 0; i < 4; i += 1) {
      const name =
        i === 3
          ? 'Review Answers'
          : 'Next'

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', {
            name,
          }),
        )
      })
    }

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name:
            'Submit Weekly Check-In',
        }),
      )
    })

    expect(
      mocks.submitCheckIn,
    ).toHaveBeenCalledOnce()
    expect(onBack).toHaveBeenCalledOnce()
  })

  test('submission validation redirects to invalid step and does not submit', async () => {
    let reflectionValid = true

    mocks.canContinueWeeklyStep.mockImplementation(
      (step) => {
        if (step === 'reflection') {
          return reflectionValid
        }
        return true
      },
    )

    renderPage()

    for (let i = 0; i < 4; i += 1) {
      const name =
        i === 3
          ? 'Review Answers'
          : 'Next'

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', {
            name,
          }),
        )
      })
    }

    reflectionValid = false

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name:
            'Submit Weekly Check-In',
        }),
      )
    })

    expect(
      mocks.submitCheckIn,
    ).not.toHaveBeenCalled()

    expect(
      screen.getByRole('alert')
        .textContent,
    ).toContain(
      'One answer still needs attention',
    )

    expect(
      screen.getByText(
        'Active step: reflection',
      ),
    ).toBeTruthy()
  })

  test('completed Weekly opens directly in review mode', async () => {
    mocks.hookState = {
      ...mocks.hookState,
      isCompleted: true,
      resumeStep: 'review',
    }

    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Week 2 Check-In',
        }),
      ).toBeTruthy()
    })

    expect(
      screen.getByTestId(
        'weekly-review',
      ),
    ).toBeTruthy()
  })

  test('preview review disables submit and offers Restart Preview', async () => {
    mocks.hookState = {
      ...mocks.hookState,
      persistenceEnabled: false,
    }

    renderPage()

    for (let i = 0; i < 4; i += 1) {
      const name =
        i === 3
          ? 'Review Answers'
          : 'Next'

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', {
            name,
          }),
        )
      })
    }

    expect(
      screen.getByRole('button', {
        name:
          'Submit Weekly Check-In',
      }).disabled,
    ).toBe(true)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Restart Preview',
      }),
    )

    expect(
      mocks.resetPreview,
    ).toHaveBeenCalledOnce()

    expect(
      screen.getByText(
        'Active step: weight',
      ),
    ).toBeTruthy()
  })

  test('selects cardio zero on focus/click/pointerup in Weekly cardio step', async () => {
    renderPage()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Next',
        }),
      )
    })

    const input =
      screen.getByRole('textbox', {
        name:
          'Weekly cardio minutes',
      })

    const selectSpy =
      vi.spyOn(input, 'select')

    fireEvent.focus(input)
    fireEvent.click(input)
    fireEvent.pointerUp(input)

    await waitFor(() => {
      expect(
        selectSpy,
      ).toHaveBeenCalled()
    })
  })

  test('shows hook/page error as alert', () => {
    mocks.hookState = {
      ...mocks.hookState,
      error: 'Weekly failed',
    }

    renderPage()

    expect(
      screen.getByRole('alert')
        .textContent,
    ).toBe('Weekly failed')
  })
})
