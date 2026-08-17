// @vitest-environment jsdom

import React from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
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
  saveCheckIn: vi.fn(),
  markForwardNavigation: vi.fn(),
  markBackNavigation: vi.fn(),
  focusField: vi.fn(),
  requestWarningConfirmation: vi.fn(),
  confirmWarningValues: vi.fn(),
  cancelWarningConfirmation: vi.fn(),
  canContinueDailyStep: vi.fn(),
  getDailyCheckInSteps: vi.fn(),
  getFirstInvalidDailyStep: vi.fn(),
}))

vi.mock(
  '../hooks/useDailyCheckIn',
  () => ({
    useDailyCheckIn: vi.fn(
      () => mocks.hookState,
    ),
  }),
)

vi.mock(
  '../hooks/useCheckInMeasurementValidation',
  () => ({
    useCheckInMeasurementValidation: vi.fn(
      () => ({
        validationByField: {
          morning_weight: {
            status: 'valid',
            message: '',
          },
        },
        warningConfirmation: null,
        requestWarningConfirmation:
          mocks.requestWarningConfirmation,
        confirmWarningValues:
          mocks.confirmWarningValues,
        cancelWarningConfirmation:
          mocks.cancelWarningConfirmation,
      }),
    ),
  }),
)

vi.mock(
  '../hooks/useWizardFocus',
  () => ({
    useWizardFocus: vi.fn(() => ({
      markForwardNavigation:
        mocks.markForwardNavigation,
      markBackNavigation:
        mocks.markBackNavigation,
      focusField: mocks.focusField,
    })),
  }),
)

vi.mock(
  '../utils/dailyCheckInFlow',
  () => ({
    DAILY_CHECKIN_STEP_IDS: {
      WEIGHT: 'weight',
      CARDIO: 'cardio',
      NOTES: 'notes',
    },
    getDailyCheckInSteps:
      mocks.getDailyCheckInSteps,
    canContinueDailyStep:
      mocks.canContinueDailyStep,
    getFirstInvalidDailyStep:
      mocks.getFirstInvalidDailyStep,
  }),
)

vi.mock(
  '../utils/measurementValidation',
  () => ({
    DAILY_VALIDATED_MEASUREMENT_FIELDS: [
      'morning_weight',
    ],
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
  '../components/wizard',
  () => ({
    WizardPage: ({
      title,
      subtitle,
      status,
      progress,
      stepLabel,
      onBack,
      backLabel = 'Back to Dashboard',
      actions,
      footer,
      children,
    }) => (
      <main>
        <button
          type="button"
          onClick={onBack}
        >
          {backLabel}
        </button>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {status}
        {progress !== undefined && (
          <progress
            max="100"
            value={progress}
          />
        )}
        {stepLabel && <p>{stepLabel}</p>}
        {children}
        {actions}
        {footer}
      </main>
    ),
    WizardActions: ({
      backDisabled,
      nextDisabled,
      backLabel,
      nextLabel,
      busy,
      onBack,
      onNext,
    }) => (
      <div>
        <button
          type="button"
          disabled={backDisabled || busy}
          onClick={onBack}
        >
          {backLabel}
        </button>
        <button
          type="button"
          disabled={nextDisabled || busy}
          onClick={onNext}
        >
          {nextLabel}
        </button>
      </div>
    ),
  }),
)

vi.mock(
  '../components/checkin/DailyCheckInStep',
  () => ({
    DailyCheckInStep: ({
      step,
      form,
      setField,
    }) => (
      <section data-testid="daily-step">
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
        {step === 'cardio' && (
          <input
            id="daily-cardio-minutes"
            aria-label="Cardio minutes"
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
  '../components/checkin/DailyCheckInReview',
  () => ({
    DailyCheckInReview: ({
      form,
    }) => (
      <section data-testid="daily-review">
        Review score: {
          form.meal_plan_score
        }
      </section>
    ),
  }),
)

import {
  DailyCheckInPage,
} from './DailyCheckInPage'

afterEach(() => {
  cleanup()
})

function renderPage(props = {}) {
  return render(
    <DailyCheckInPage
      plan={{
        id: 'plan-1',
        start_date: '2026-08-14',
      }}
      target={{}}
      cardioCompleted={30}
      settings={{
        track_water: true,
        track_alcohol: true,
      }}
      onSaved={vi.fn()}
      onBack={vi.fn()}
      {...props}
    />,
  )
}

async function clickButton(name) {
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', {
        name,
      }),
    )
  })
}

describe('DailyCheckInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.hookState = {
      today: '2026-08-15',
      checkInDate: '2026-08-15',
      firstCheckInDate: '2026-08-15',
      form: {
        weight_status: 'recorded',
        morning_weight: '150',
        cardio_minutes: '0',
        meal_plan_score: '5',
      },
      existingCheckIn: null,
      hasDraft: false,
      resumeStep: null,
      saveMessage: '',
      isDirty: false,
      loading: false,
      saving: false,
      error: '',
      successMessage: '',
      canEdit: true,
      planHasStarted: true,
      setField: mocks.setField,
      saveDraft: mocks.saveDraft,
      saveCheckIn: mocks.saveCheckIn,
    }

    mocks.getDailyCheckInSteps.mockReturnValue([
      'weight',
      'cardio',
      'notes',
    ])
    mocks.canContinueDailyStep.mockReturnValue(
      true,
    )
    mocks.getFirstInvalidDailyStep.mockReturnValue(
      null,
    )
    mocks.requestWarningConfirmation.mockReturnValue(
      false,
    )
    mocks.saveDraft.mockResolvedValue(true)
    mocks.saveCheckIn.mockResolvedValue(true)
  })

  test('shows loading state', () => {
    mocks.hookState = {
      ...mocks.hookState,
      loading: true,
    }

    renderPage()

    expect(
      screen.getByText(
        'Loading today’s check-in...',
      ),
    ).toBeTruthy()
  })

  test('shows missing-plan alert', () => {
    renderPage({ plan: null })

    expect(
      screen.getByRole('alert')
        .textContent,
    ).toBe(
      'No active coaching plan was found.',
    )
  })

  test('shows first-check-in date when Daily is not yet available', () => {
    mocks.hookState = {
      ...mocks.hookState,
      canEdit: false,
      planHasStarted: false,
    }

    renderPage()

    expect(
      screen.getByText(
        'Daily check-ins begin the morning after your program starts.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Formatted 2026-08-15',
      ),
    ).toBeTruthy()
  })

  test('starts DEV preview from unavailable state', () => {
    mocks.hookState = {
      ...mocks.hookState,
      canEdit: false,
      planHasStarted: false,
    }

    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Preview Check-In Wizard',
      }),
    )

    expect(
      screen.getByRole('status')
        .textContent,
    ).toContain(
      'Preview mode',
    )
    expect(
      screen.getByText(
        'Active step: weight',
      ),
    ).toBeTruthy()
  })

  test('starts on Weight with Back disabled', () => {
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

  test('passes field changes from Daily step into the hook', () => {
    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Mock set weight status',
      }),
    )

    expect(
      mocks.setField,
    ).toHaveBeenCalledWith(
      'weight_status',
      'recorded',
    )
  })

  test('moves through Daily wizard and reaches review', async () => {
    renderPage()

    await clickButton('Next')

    expect(
      screen.getByText(
        'Active step: cardio',
      ),
    ).toBeTruthy()

    await clickButton('Next')

    expect(
      screen.getByText(
        'Active step: notes',
      ),
    ).toBeTruthy()

    await clickButton('Review Answers')

    expect(
      screen.getByRole('heading', {
        name: 'Review Your Answers',
      }),
    ).toBeTruthy()

    expect(
      screen.getByTestId(
        'daily-review',
      ),
    ).toBeTruthy()
  })

  test('Back from review returns to the final Daily step', async () => {
    renderPage()

    await clickButton('Next')
    await clickButton('Next')
    await clickButton('Review Answers')
    await clickButton('Edit Answers')

    expect(
      screen.getByText(
        'Active step: notes',
      ),
    ).toBeTruthy()
  })

  test('blocks Next when current Daily step cannot continue', () => {
    mocks.canContinueDailyStep.mockReturnValue(
      false,
    )

    renderPage()

    expect(
      screen.getByRole('button', {
        name: 'Next',
      }).disabled,
    ).toBe(true)
  })

  test('requests warning confirmation before leaving recorded Weight', () => {
    mocks.requestWarningConfirmation.mockReturnValue(
      true,
    )

    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Next',
      }),
    )

    expect(
      mocks.requestWarningConfirmation,
    ).toHaveBeenCalledWith([
      'morning_weight',
    ])
    expect(
      mocks.markForwardNavigation,
    ).not.toHaveBeenCalled()
  })

  test('submits a new Daily Check-In from review and shows confirmation', async () => {
    renderPage()

    await clickButton('Next')
    await clickButton('Next')
    await clickButton('Review Answers')
    await clickButton('Submit Check-In')

    expect(
      mocks.saveCheckIn,
    ).toHaveBeenCalledOnce()

    expect(
      screen.getByRole('heading', {
        name: 'Check-In Saved',
      }),
    ).toBeTruthy()
  })

  test('editing mode uses update labels and disables review save when nothing changed', () => {
    mocks.hookState = {
      ...mocks.hookState,
      existingCheckIn: {
        id: 'daily-1',
      },
      isDirty: false,
    }

    renderPage()

    expect(
      screen.getByRole('heading', {
        name: 'Update Daily Check-In',
      }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Next',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Next',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Review Changes',
      }),
    )

    expect(
      screen.getByRole('button', {
        name: 'Save Changes',
      }).disabled,
    ).toBe(true)
  })

  test('quick Save Changes is available during editing only when dirty', async () => {
    mocks.hookState = {
      ...mocks.hookState,
      existingCheckIn: {
        id: 'daily-1',
      },
      isDirty: true,
    }

    renderPage()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Save Changes',
        }),
      )
    })

    expect(
      mocks.saveCheckIn,
    ).toHaveBeenCalledOnce()

    expect(
      screen.getByRole('heading', {
        name: 'Check-In Updated',
      }),
    ).toBeTruthy()
  })

  test('redirects to the first invalid Daily step instead of saving', async () => {
    mocks.getFirstInvalidDailyStep.mockReturnValue(
      'cardio',
    )

    mocks.hookState = {
      ...mocks.hookState,
      existingCheckIn: {
        id: 'daily-1',
      },
      isDirty: true,
    }

    renderPage()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Save Changes',
        }),
      )
    })

    expect(
      mocks.saveCheckIn,
    ).not.toHaveBeenCalled()

    expect(
      screen.getByText(
        'Active step: cardio',
      ),
    ).toBeTruthy()
  })

  test('selects the default cardio zero when the cardio input receives focus', () => {
    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Next',
      }),
    )

    const input =
      screen.getByRole('textbox', {
        name: 'Cardio minutes',
      })

    const selectSpy =
      vi.spyOn(input, 'select')

    fireEvent.focus(input)

    expect(
      selectSpy,
    ).toHaveBeenCalled()
  })

  test('historical edit displays the selected Daily Check-In date', () => {
    mocks.hookState = {
      ...mocks.hookState,
      checkInDate: '2026-08-13',
      existingCheckIn: {
        id: 'daily-old',
      },
    }

    renderPage({
      checkinDate: '2026-08-13',
      completionReturnLabel:
        'Back to Daily Check-Ins',
    })

    expect(
      screen.getByRole('heading', {
        name: 'Update Daily Check-In',
      }),
    ).toBeTruthy()

    expect(
      screen.getByText(
        'Formatted 2026-08-13',
      ),
    ).toBeTruthy()
  })

  test('historical edit uses Back to Daily Check-Ins label', () => {
    mocks.hookState = {
      ...mocks.hookState,
      checkInDate: '2026-08-13',
      existingCheckIn: {
        id: 'daily-old',
      },
    }

    renderPage({
      checkinDate: '2026-08-13',
      completionReturnLabel:
        'Back to Daily Check-Ins',
    })

    expect(
      screen.getByRole('button', {
        name: 'Back to Daily Check-Ins',
      }),
    ).toBeTruthy()
  })

  test('incomplete Daily uses Exit Check-In while completed edits keep the return label', async () => {
    const onBack = vi.fn()

    renderPage({ onBack })

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Exit Check-In',
        }),
      )
    })

    expect(onBack).toHaveBeenCalledOnce()

    cleanup()
    onBack.mockClear()

    mocks.hookState = {
      ...mocks.hookState,
      existingCheckIn: {
        id: 'daily-1',
      },
    }

    renderPage({ onBack })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Back to Dashboard',
      }),
    )

    expect(onBack).toHaveBeenCalledOnce()
  })

  test('dirty incomplete Daily autosaves before exiting', async () => {
    const onBack = vi.fn()

    mocks.hookState = {
      ...mocks.hookState,
      isDirty: true,
    }

    renderPage({ onBack })

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Exit Check-In',
        }),
      )
    })

    expect(
      mocks.saveDraft,
    ).toHaveBeenCalledWith(
      'weight',
    )
    expect(onBack).toHaveBeenCalledOnce()
  })
})
