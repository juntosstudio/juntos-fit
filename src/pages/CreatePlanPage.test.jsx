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
  savePlan: vi.fn(),
  setField: vi.fn(),
  markForwardNavigation: vi.fn(),
  markBackNavigation: vi.fn(),
  validateCreatePlanStep: vi.fn(),
}))

vi.mock(
  '../hooks/useCreatePlan',
  () => ({
    useCreatePlan: vi.fn(
      () => mocks.hookState,
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
    })),
  }),
)

vi.mock(
  '../utils/createPlanFlow',
  () => ({
    CREATE_PLAN_STEPS: [
      'goal',
      'unit_system',
      'activity',
    ],
    validateCreatePlanStep:
      mocks.validateCreatePlanStep,
  }),
)

vi.mock(
  '../components/plan/CreatePlanStep',
  () => ({
    CreatePlanStep: ({
      step,
      form,
      setField,
    }) => (
      <section data-testid="plan-step">
        <p>Active step: {step}</p>
        <p>
          Goal value: {form.goal || 'blank'}
        </p>
        <button
          type="button"
          onClick={() =>
            setField(
              'goal',
              'fat_loss',
            )
          }
        >
          Mock choose goal
        </button>
      </section>
    ),
  }),
)

vi.mock(
  '../components/plan/CreatePlanReview',
  () => ({
    CreatePlanReview: ({ form }) => (
      <section data-testid="plan-review">
        Review goal: {form.goal}
      </section>
    ),
  }),
)

import {
  CreatePlanPage,
} from './CreatePlanPage'

afterEach(() => {
  cleanup()
})

function renderPage(props = {}) {
  return render(
    <CreatePlanPage
      userId="user-1"
      onSaved={vi.fn()}
      onBack={vi.fn()}
      {...props}
    />,
  )
}

describe('CreatePlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.hookState = {
      today: '2026-08-15',
      form: {
        goal: 'fat_loss',
      },
      saving: false,
      error: '',
      createdPlanId: null,
      setField: mocks.setField,
      savePlan: mocks.savePlan,
    }

    mocks.validateCreatePlanStep.mockReturnValue(
      '',
    )

    mocks.savePlan.mockResolvedValue({
      saved: true,
      invalidStep: null,
    })
  })

  test('starts on the first wizard step with Back disabled', () => {
    renderPage()

    expect(
      screen.getByRole('heading', {
        name: 'Create Plan',
      }),
    ).toBeTruthy()

    expect(
      screen.getByText(
        'Step 1 of 3',
      ),
    ).toBeTruthy()

    expect(
      screen.getByText(
        'Active step: goal',
      ),
    ).toBeTruthy()

    expect(
      screen.getByRole('button', {
        name: 'Back',
      }).disabled,
    ).toBe(true)

    expect(
      screen.getByRole('button', {
        name: 'Next',
      }).disabled,
    ).toBe(false)
  })

  test('passes field changes from the step component into the hook', () => {
    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Mock choose goal',
      }),
    )

    expect(
      mocks.setField,
    ).toHaveBeenCalledWith(
      'goal',
      'fat_loss',
    )
  })

  test('disables Next when the active step has a validation error', () => {
    mocks.validateCreatePlanStep.mockReturnValue(
      'Choose a goal.',
    )

    renderPage()

    expect(
      screen.getByRole('button', {
        name: 'Next',
      }).disabled,
    ).toBe(true)
  })

  test('moves forward through wizard steps and reaches Review Plan', () => {
    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Next',
      }),
    )

    expect(
      screen.getByText(
        'Active step: unit_system',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Step 2 of 3',
      ),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Next',
      }),
    )

    expect(
      screen.getByText(
        'Active step: activity',
      ),
    ).toBeTruthy()

    expect(
      screen.getByRole('button', {
        name: 'Review Plan',
      }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Review Plan',
      }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'Review Your Plan',
      }),
    ).toBeTruthy()

    expect(
      screen.getByText(
        'Final review',
      ),
    ).toBeTruthy()

    expect(
      screen.getByTestId('plan-review'),
    ).toBeTruthy()

    expect(
      mocks.markForwardNavigation,
    ).toHaveBeenCalledTimes(3)
  })

  test('Edit Plan returns from review to the final wizard step', () => {
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
        name: 'Review Plan',
      }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit Plan',
      }),
    )

    expect(
      screen.getByText(
        'Active step: activity',
      ),
    ).toBeTruthy()

    expect(
      mocks.markBackNavigation,
    ).toHaveBeenCalled()
  })

  test('Back navigates to the previous wizard step without going below step one', () => {
    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Next',
      }),
    )

    expect(
      screen.getByText(
        'Active step: unit_system',
      ),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Back',
      }),
    )

    expect(
      screen.getByText(
        'Active step: goal',
      ),
    ).toBeTruthy()
  })

  test('preview mode shows status and prevents Create Plan submission', () => {
    renderPage({
      previewOnly: true,
    })

    expect(
      screen.getByRole('status')
        .textContent,
    ).toContain(
      'Preview mode',
    )

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
        name: 'Review Plan',
      }),
    )

    expect(
      screen.getByRole('button', {
        name: 'Create Plan',
      }).disabled,
    ).toBe(true)

    expect(
      mocks.savePlan,
    ).not.toHaveBeenCalled()
  })

  test('submits the plan from review mode', async () => {
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
        name: 'Review Plan',
      }),
    )

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Create Plan',
        }),
      )
    })

    expect(
      mocks.savePlan,
    ).toHaveBeenCalledOnce()
  })

  test('returns to the invalid wizard step when savePlan reports one', async () => {
    mocks.savePlan.mockResolvedValue({
      saved: false,
      invalidStep: 'unit_system',
    })

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
        name: 'Review Plan',
      }),
    )

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Create Plan',
        }),
      )
    })

    expect(
      screen.getByText(
        'Active step: unit_system',
      ),
    ).toBeTruthy()

    expect(
      mocks.markForwardNavigation,
    ).toHaveBeenCalled()
  })

  test('shows hook error text as an alert', () => {
    mocks.hookState = {
      ...mocks.hookState,
      error:
        'Your coaching plan could not be created.',
    }

    renderPage()

    expect(
      screen.getByRole('alert')
        .textContent,
    ).toBe(
      'Your coaching plan could not be created.',
    )
  })

  test('shows saving label and disables wizard actions while saving', () => {
    mocks.hookState = {
      ...mocks.hookState,
      saving: true,
    }

    renderPage()

    expect(
      screen.getByRole('button', {
        name: 'Creating Plan...',
      }).disabled,
    ).toBe(true)

    expect(
      screen.getByRole('button', {
        name: 'Back',
      }).disabled,
    ).toBe(true)
  })

  test('shows Plan Created confirmation and routes back to dashboard', () => {
    const onBack = vi.fn()

    mocks.hookState = {
      ...mocks.hookState,
      createdPlanId: 'plan-123',
    }

    renderPage({ onBack })

    expect(
      screen.getByRole('dialog'),
    ).toBeTruthy()

    expect(
      screen.getByRole('heading', {
        name: 'Plan Created',
      }),
    ).toBeTruthy()

    const backButtons =
      screen.getAllByRole(
        'button',
        {
          name: 'Back to Dashboard',
        },
      )

    fireEvent.click(
      backButtons.at(-1),
    )

    expect(onBack).toHaveBeenCalledOnce()
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
