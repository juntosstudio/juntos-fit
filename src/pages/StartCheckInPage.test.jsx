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
  clearMessages: vi.fn(),
  saveCheckIn: vi.fn(),
  uploadPhoto: vi.fn(),
  markForwardNavigation: vi.fn(),
  markBackNavigation: vi.fn(),
  focusField: vi.fn(),
  requestWarningConfirmation: vi.fn(),
  confirmWarningValues: vi.fn(),
  cancelWarningConfirmation: vi.fn(),
  getStartCheckInSteps: vi.fn(),
  canContinueMeasurementFields: vi.fn(),
}))

vi.mock(
  '../hooks/useStartCheckIn',
  () => ({
    useStartCheckIn: vi.fn(
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
          starting_weight_lbs: {
            status: 'valid',
            message: '',
          },
          body_fat_percent: {
            status: 'valid',
            message: '',
          },
          neck_inches: {
            status: 'valid',
            message: '',
          },
          chest_inches: {
            status: 'valid',
            message: '',
          },
          waist_inches: {
            status: 'valid',
            message: '',
          },
          hips_inches: {
            status: 'valid',
            message: '',
          },
          upper_arm_inches: {
            status: 'valid',
            message: '',
          },
          thigh_inches: {
            status: 'valid',
            message: '',
          },
          calf_inches: {
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
  '../utils/startCheckInFlow',
  () => ({
    START_CHECKIN_STEP_IDS: {
      TIPS: 'tips',
      WEIGHT: 'weight',
      BODY_FAT: 'body_fat',
      NECK: 'neck',
      CHEST: 'chest',
      WAIST: 'waist',
      HIPS: 'hips',
      SIDE: 'side',
      SIDE_MEASUREMENTS:
        'side_measurements',
      FRONT_PHOTO: 'front_photo',
      SIDE_PHOTO: 'side_photo',
      BACK_PHOTO: 'back_photo',
    },
    getStartCheckInSteps:
      mocks.getStartCheckInSteps,
  }),
)

vi.mock(
  '../utils/measurementValidation',
  () => ({
    START_VALIDATED_MEASUREMENT_FIELDS: [
      'starting_weight_lbs',
      'body_fat_percent',
      'neck_inches',
      'chest_inches',
      'waist_inches',
      'hips_inches',
      'upper_arm_inches',
      'thigh_inches',
      'calf_inches',
    ],
    canContinueMeasurementFields:
      mocks.canContinueMeasurementFields,
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
  '../components/startcheckin/StartCheckInStep',
  () => ({
    StartCheckInStep: ({
      step,
      form,
      setField,
      readOnly,
      previewing,
    }) => (
      <section data-testid="start-step">
        <p>Active step: {step}</p>
        <p>
          Read only: {String(readOnly)}
        </p>
        <p>
          Previewing: {String(previewing)}
        </p>
        {step === 'weight' && (
          <button
            type="button"
            onClick={() =>
              setField(
                'starting_weight_status',
                'recorded',
              )
            }
          >
            Mock set weight status
          </button>
        )}
      </section>
    ),
  }),
)

vi.mock(
  '../components/startcheckin/StartCheckInReview',
  () => ({
    StartCheckInReview: ({
      form,
    }) => (
      <section data-testid="start-review">
        Review side: {
          form.measurement_side
        }
      </section>
    ),
  }),
)

import {
  StartCheckInPage,
} from './StartCheckInPage'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

function renderPage(props = {}) {
  return render(
    <StartCheckInPage
      plan={{
        id: 'plan-1',
        start_date: '2026-08-15',
        body_fat_source: 'none',
      }}
      onSaved={vi.fn()}
      onBack={vi.fn()}
      {...props}
    />,
  )
}

describe('StartCheckInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.hookState = {
      unitSystem: 'imperial',
      form: {
        starting_weight_status: 'recorded',
        starting_weight_lbs: '150',
        body_fat_percent: '',
        body_fat_unavailable: false,
        neck_inches: '14',
        chest_inches: '36',
        waist_inches: '32',
        hips_inches: '40',
        measurement_side: 'right',
        upper_arm_inches: '12',
        thigh_inches: '22',
        calf_inches: '14',
      },
      photos: {
        front: {
          id: 'front-1',
        },
        side: {
          id: 'side-1',
          side_view: 'right',
        },
        back: {
          id: 'back-1',
        },
      },
      estimatedBodyFat: null,
      isDirty: false,
      loading: false,
      saving: false,
      uploadingPose: '',
      error: '',
      successMessage: '',
      canEdit: true,
      isReadOnly: false,
      planHasStarted: true,
      isCompleted: false,
      setField: mocks.setField,
      clearMessages:
        mocks.clearMessages,
      saveCheckIn:
        mocks.saveCheckIn,
      uploadPhoto:
        mocks.uploadPhoto,
    }

    mocks.getStartCheckInSteps.mockReturnValue([
      'tips',
      'weight',
      'waist',
      'side',
      'front_photo',
      'side_photo',
      'back_photo',
    ])

    mocks.canContinueMeasurementFields.mockReturnValue(
      true,
    )

    mocks.requestWarningConfirmation.mockReturnValue(
      false,
    )

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
        'Loading your starting baseline...',
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

  test('shows future availability message before Start Day', () => {
    mocks.hookState = {
      ...mocks.hookState,
      canEdit: false,
      planHasStarted: false,
      isCompleted: false,
    }

    renderPage()

    expect(
      screen.getByText(
        'Your Start Check-In will be available on your plan start date.',
      ),
    ).toBeTruthy()

    expect(
      screen.getByText(
        'Formatted 2026-08-15',
      ),
    ).toBeTruthy()
  })

  test('starts DEV preview from future availability screen', () => {
    mocks.hookState = {
      ...mocks.hookState,
      canEdit: false,
      planHasStarted: false,
      isCompleted: false,
    }

    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name:
          'Preview Start Check-In Wizard',
      }),
    )

    expect(
      screen.getByRole('status')
        .textContent,
    ).toContain(
      'Preview mode',
    )

    expect(
      screen.getByRole('heading', {
        name:
          'Preview Start Check-In',
      }),
    ).toBeTruthy()
  })

  test('starts on Tips with Back disabled', () => {
    renderPage()

    expect(
      screen.getByText(
        'Active step: tips',
      ),
    ).toBeTruthy()

    expect(
      screen.getByRole('button', {
        name: 'Back',
      }).disabled,
    ).toBe(true)
  })

  test('passes field changes from Start step into the hook', () => {
    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Next',
      }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name:
          'Mock set weight status',
      }),
    )

    expect(
      mocks.setField,
    ).toHaveBeenCalledWith(
      'starting_weight_status',
      'recorded',
    )
  })

  test('moves through the Start wizard and reaches review', () => {
    renderPage()

    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Next',
        }),
      )
    }

    expect(
      screen.getByText(
        'Active step: back_photo',
      ),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Review Baseline',
      }),
    )

    expect(
      screen.getByRole('heading', {
        name:
          'Review Your Starting Baseline',
      }),
    ).toBeTruthy()

    expect(
      screen.getByTestId(
        'start-review',
      ),
    ).toBeTruthy()
  })

  test('Back from review returns to the final Start step', () => {
    renderPage()

    for (let i = 0; i < 7; i += 1) {
      const button =
        screen.queryByRole('button', {
          name: 'Next',
        })

      if (button) {
        fireEvent.click(button)
      }
    }

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Review Baseline',
      }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit Answers',
      }),
    )

    expect(
      screen.getByText(
        'Active step: back_photo',
      ),
    ).toBeTruthy()
  })

  test('Save Progress calls saveCheckIn with complete false when dirty', async () => {
    mocks.hookState = {
      ...mocks.hookState,
      isDirty: true,
    }

    renderPage()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Save Progress',
        }),
      )
    })

    expect(
      mocks.saveCheckIn,
    ).toHaveBeenCalledWith({
      complete: false,
    })
  })

  test('completes Start Check-In from review and shows completion dialog', async () => {
    renderPage()

    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Next',
        }),
      )
    }

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Review Baseline',
      }),
    )

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name:
            'Complete Start Check-In',
        }),
      )
    })

    expect(
      mocks.saveCheckIn,
    ).toHaveBeenCalledWith({
      complete: true,
    })

    expect(
      screen.getByRole('heading', {
        name:
          'Start Check-In Complete',
      }),
    ).toBeTruthy()
  })

  test('completed editable Start Check-In uses update labels', async () => {
    mocks.hookState = {
      ...mocks.hookState,
      isCompleted: true,
      isDirty: true,
    }

    renderPage()

    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Next',
        }),
      )
    }

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Review Changes',
      }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'Review Your Changes',
      }),
    ).toBeTruthy()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Save Changes',
        }),
      )
    })

    expect(
      screen.getByRole('heading', {
        name:
          'Start Check-In Updated',
      }),
    ).toBeTruthy()
  })

  test('read-only completed Start Check-In shows locked baseline', () => {
    mocks.hookState = {
      ...mocks.hookState,
      canEdit: false,
      isReadOnly: true,
      isCompleted: true,
    }

    renderPage()

    expect(
      screen.getByRole('heading', {
        name: 'View Start Check-In',
      }),
    ).toBeTruthy()

    expect(
      screen.getByText(
        'This baseline is locked and view-only.',
      ),
    ).toBeTruthy()

    expect(
      screen.getByText(
        'Read only: true',
      ),
    ).toBeTruthy()
  })

  test('blocks Next when active measurement cannot continue', () => {
    mocks.getStartCheckInSteps.mockReturnValue([
      'weight',
      'waist',
    ])
    mocks.canContinueMeasurementFields.mockReturnValue(
      false,
    )

    renderPage()

    expect(
      screen.getByRole('button', {
        name: 'Next',
      }).disabled,
    ).toBe(true)
  })

  test('requests warning confirmation before advancing a measurement step', () => {
    mocks.getStartCheckInSteps.mockReturnValue([
      'weight',
      'waist',
    ])
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
      'starting_weight_lbs',
    ])

    expect(
      mocks.markForwardNavigation,
    ).not.toHaveBeenCalled()
  })

  test('completion redirects to the first invalid step instead of saving', async () => {
    let waistValid = true

    mocks.getStartCheckInSteps.mockReturnValue([
      'tips',
      'weight',
      'waist',
    ])

    mocks.canContinueMeasurementFields.mockImplementation(
      (fields) => {
        if (
          fields.includes(
            'waist_inches',
          )
        ) {
          return waistValid
        }

        return true
      },
    )

    renderPage()

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
        name: 'Review Baseline',
      }),
    )

    waistValid = false

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name:
            'Complete Start Check-In',
        }),
      )
    })

    expect(
      mocks.saveCheckIn,
    ).not.toHaveBeenCalled()

    expect(
      screen.getByText(
        'Active step: waist',
      ),
    ).toBeTruthy()
  })

  test('top Back to Dashboard calls onBack', () => {
    const onBack = vi.fn()

    renderPage({ onBack })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Back to Dashboard',
      }),
    )

    expect(onBack).toHaveBeenCalledOnce()
  })
})
