/** @vitest-environment jsdom */
import {
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
  accept: vi.fn(),
  createMessageId: vi.fn(),
  decline: vi.fn(),
  generate: vi.fn(),
  loadConversation: vi.fn(),
  loadLatest: vi.fn(),
  sendMessage: vi.fn(),
}))

vi.mock('../services/planAdjustmentService', () => ({
  acceptPlanAdjustment: mocks.accept,
  createPlanAdjustmentClientMessageId:
    mocks.createMessageId,
  declinePlanAdjustment: mocks.decline,
  generatePlanAdjustment: mocks.generate,
  loadLatestPlanAdjustment: mocks.loadLatest,
  loadPlanAdjustmentConversation:
    mocks.loadConversation,
  sendPlanAdjustmentMessage: mocks.sendMessage,
}))

import { PlanAdjustmentPage } from './PlanAdjustmentPage'

function proposal(overrides = {}) {
  return {
    id: 'proposal-1',
    weekly_checkin_id: 'weekly-1',
    revision_number: 1,
    decision_type: 'recommend_change',
    action_id: 'nutrition_decrease_100',
    status: 'proposed',
    proposed_effective_date: '2026-08-23',
    effective_date: null,
    user_explanation:
      'Your trend supports a small calorie reduction.',
    proposed_prescription: {
      calorie_target: 1600,
      protein_grams: 165,
      carb_grams: 100,
      fat_grams: 60,
      weekly_cardio_target_minutes: 60,
      weekly_workout_target: 3,
      daily_water_goal_oz: 80,
      cardio_intensity_target: 'easy',
      nutrition_ownership: 'juntos_managed',
    },
    ...overrides,
  }
}

function renderPage(overrides = {}) {
  return render(
    <PlanAdjustmentPage
      weeklyCheckInId="weekly-1"
      weekNumber={4}
      onBack={vi.fn()}
      onResolved={vi.fn()}
      onOpenToday={vi.fn()}
      onOpenHistory={vi.fn()}
      onOpenPlan={vi.fn()}
      onOpenSettings={vi.fn()}
      {...overrides}
    />,
  )
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createMessageId.mockReturnValue(
    '11111111-1111-4111-8111-111111111111',
  )
  mocks.loadConversation.mockResolvedValue([])
  mocks.loadLatest.mockResolvedValue(null)
  mocks.generate.mockResolvedValue(proposal())
})

describe('PlanAdjustmentPage', () => {
  test('generates a missing recommendation and requires explicit acceptance confirmation', async () => {
    const onResolved = vi.fn()

    mocks.accept.mockResolvedValue({
      outcome: 'accepted',
      proposal: proposal({
        status: 'accepted',
        effective_date: '2026-08-23',
      }),
      applied_target: {
        id: 'target-2',
      },
    })

    renderPage({ onResolved })

    expect(
      await screen.findByRole('heading', {
        name: /reduce calories by 100 per day/i,
      }),
    ).toBeTruthy()

    expect(mocks.generate).toHaveBeenCalledWith(
      'weekly-1',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Accept & Update Plan',
      }),
    )

    expect(mocks.accept).not.toHaveBeenCalled()
    expect(
      screen.getByRole('dialog'),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Yes, Apply It',
      }),
    )

    await waitFor(() => {
      expect(mocks.accept).toHaveBeenCalledWith(
        'proposal-1',
      )
    })

    expect(onResolved).toHaveBeenCalled()
    expect(
      await screen.findByRole('heading', {
        name: 'Plan Adjustment Accepted',
      }),
    ).toBeTruthy()
  })

  test('updates the visible proposal when conversation creates a legal revision', async () => {
    mocks.loadLatest.mockResolvedValue(proposal())
    mocks.sendMessage.mockResolvedValue({
      proposal: proposal({
        id: 'proposal-2',
        revision_number: 2,
        action_id: 'cardio_increase_60_to_75',
        user_explanation:
          'Cardio is the better lever after your preference.',
        proposed_prescription: {
          ...proposal().proposed_prescription,
          weekly_cardio_target_minutes: 75,
        },
      }),
      message: {
        id: 'coach-2',
      },
      revised: true,
      cached: false,
    })
    mocks.loadConversation
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'user-1',
          role: 'user',
          content: 'I would rather add cardio.',
          client_message_id:
            '11111111-1111-4111-8111-111111111111',
        },
        {
          id: 'coach-2',
          role: 'coach',
          content: 'That is legal, so I revised it.',
          in_reply_to_message_id: 'user-1',
        },
      ])

    renderPage()

    const textarea =
      await screen.findByLabelText(
        'Message Juntos Coach',
      )

    fireEvent.change(textarea, {
      target: {
        value: 'I would rather add cardio.',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Send',
      }),
    )

    await waitFor(() => {
      expect(mocks.sendMessage).toHaveBeenCalledWith({
        weeklyCheckInId: 'weekly-1',
        message: 'I would rather add cardio.',
        clientMessageId:
          '11111111-1111-4111-8111-111111111111',
      })
    })

    expect(
      await screen.findByRole('heading', {
        name: /increase cardio to 75 minutes/i,
      }),
    ).toBeTruthy()
    expect(
      screen.getByText('Revision 2'),
    ).toBeTruthy()
  })

  test('resumes a persisted user turn with the same client id after an interrupted coach reply', async () => {
    mocks.loadLatest.mockResolvedValue(proposal())
    mocks.loadConversation
      .mockResolvedValueOnce([
        {
          id: 'user-pending',
          role: 'user',
          content: 'Why lower calories?',
          client_message_id:
            '22222222-2222-4222-8222-222222222222',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'user-pending',
          role: 'user',
          content: 'Why lower calories?',
          client_message_id:
            '22222222-2222-4222-8222-222222222222',
        },
        {
          id: 'coach-reply',
          role: 'coach',
          content: 'Here is why.',
          in_reply_to_message_id: 'user-pending',
        },
      ])
    mocks.sendMessage.mockResolvedValue({
      proposal: proposal(),
      message: {
        id: 'coach-reply',
      },
      revised: false,
      cached: true,
    })

    renderPage()

    const retryButton =
      await screen.findByRole('button', {
        name: 'Retry Coach Reply',
      })

    expect(
      screen.getByRole('button', {
        name: 'Accept & Update Plan',
      }).disabled,
    ).toBe(true)

    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(mocks.sendMessage).toHaveBeenCalledWith({
        weeklyCheckInId: 'weekly-1',
        message: 'Why lower calories?',
        clientMessageId:
          '22222222-2222-4222-8222-222222222222',
      })
    })
  })

  test('reloads the canonical proposal when acceptance is rejected as stale', async () => {
    mocks.loadLatest
      .mockResolvedValueOnce(proposal())
      .mockResolvedValueOnce(
        proposal({
          status: 'expired',
          resolution_reason_code:
            'PROPOSAL_EXPIRED',
        }),
      )
    mocks.accept.mockRejectedValue(
      new Error(
        'This Plan Adjustment no longer exactly matches current deterministic policy.',
      ),
    )

    renderPage()

    await screen.findByRole('heading', {
      name: /reduce calories by 100 per day/i,
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Accept & Update Plan',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Yes, Apply It',
      }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Plan Adjustment Expired',
      }),
    ).toBeTruthy()
    expect(
      screen.getByText(/no longer exactly matches/i),
    ).toBeTruthy()
  })

  test('shows a resolved recommendation without conversation or resolution controls', async () => {
    mocks.loadLatest.mockResolvedValue(
      proposal({
        status: 'declined',
        declined_at: '2026-08-22T12:00:00Z',
      }),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'Recommendation Declined',
      }),
    ).toBeTruthy()

    expect(
      screen.queryByLabelText(
        'Message Juntos Coach',
      ),
    ).toBeNull()
    expect(
      screen.queryByRole('button', {
        name: 'Accept & Update Plan',
      }),
    ).toBeNull()
  })

  test('does not generate a recommendation after the 24-hour Weekly window closes', async () => {
    mocks.loadLatest.mockResolvedValue(null)

    renderPage({
      weeklySubmittedAt: '2026-08-20T12:00:00.000Z',
    })

    expect(
      await screen.findByRole('heading', {
        name: 'Plan Adjustment Window Closed',
      }),
    ).toBeTruthy()
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', {
        name: 'Accept & Update Plan',
      }),
    ).toBeNull()
  })

  test('renders an overdue proposed recommendation as expired and read-only', async () => {
    mocks.loadLatest.mockResolvedValue(
      proposal({
        expires_at: '2026-08-20T12:00:00.000Z',
      }),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'Plan Adjustment Expired',
      }),
    ).toBeTruthy()
    expect(
      screen.queryByLabelText('Message Juntos Coach'),
    ).toBeNull()
    expect(
      screen.queryByRole('button', {
        name: 'Accept & Update Plan',
      }),
    ).toBeNull()
  })

})
