import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  findPendingPlanAdjustmentTurn,
  formatPlanAdjustmentAction,
  getPlanAdjustmentHandoffState,
  isHoldPlanAdjustment,
  isPlanAdjustmentOpen,
} from './planAdjustmentUi'

describe('planAdjustmentUi', () => {
  test('formats deterministic action ids for user-facing copy', () => {
    expect(
      formatPlanAdjustmentAction(
        'nutrition_decrease_100',
      ),
    ).toMatch(/100 per day/i)

    expect(
      formatPlanAdjustmentAction(
        'cardio_increase_75_to_90',
      ),
    ).toMatch(/90 minutes/i)
  })

  test('treats only proposed revisions as open', () => {
    expect(
      isPlanAdjustmentOpen({ status: 'proposed' }),
    ).toBe(true)
    expect(
      isPlanAdjustmentOpen({ status: 'accepted' }),
    ).toBe(false)
  })

  test('recognizes HOLD from either canonical field', () => {
    expect(
      isHoldPlanAdjustment({ action_id: 'hold' }),
    ).toBe(true)
    expect(
      isHoldPlanAdjustment({ decision_type: 'hold' }),
    ).toBe(true)
  })

  test('finds the newest persisted user turn without a coach reply', () => {
    const messages = [
      {
        id: 'user-1',
        role: 'user',
        client_message_id: 'client-1',
        content: 'Why?',
      },
      {
        id: 'coach-1',
        role: 'coach',
        in_reply_to_message_id: 'user-1',
        content: 'Because.',
      },
      {
        id: 'user-2',
        role: 'user',
        client_message_id: 'client-2',
        content: 'What about cardio?',
      },
    ]

    expect(
      findPendingPlanAdjustmentTurn(messages),
    ).toMatchObject({
      id: 'user-2',
      client_message_id: 'client-2',
    })
  })

  test('returns null when every user turn has a coach reply', () => {
    expect(
      findPendingPlanAdjustmentTurn([
        {
          id: 'user-1',
          role: 'user',
          client_message_id: 'client-1',
        },
        {
          id: 'coach-1',
          role: 'coach',
          in_reply_to_message_id: 'user-1',
        },
      ]),
    ).toBeNull()
  })
  test('shows unresolved adjustments as an action item', () => {
    expect(
      getPlanAdjustmentHandoffState(null),
    ).toMatchObject({
      state: 'pending',
      buttonLabel: 'Review Plan Adjustment',
    })

    expect(
      getPlanAdjustmentHandoffState({ status: 'proposed' }),
    ).toMatchObject({
      state: 'pending',
      buttonLabel: 'Review Plan Adjustment',
    })
  })

  test('keeps accepted HOLD adjustments viewable without presenting unfinished work', () => {
    expect(
      getPlanAdjustmentHandoffState({
        status: 'accepted',
        action_id: 'hold',
      }),
    ).toMatchObject({
      state: 'accepted',
      title: 'Current prescription kept',
      buttonLabel: 'View Plan Adjustment',
    })
  })

  test('labels accepted prescription changes as resolved history', () => {
    expect(
      getPlanAdjustmentHandoffState({
        status: 'accepted',
        action_id: 'nutrition_decrease_100',
      }),
    ).toMatchObject({
      state: 'accepted',
      title: 'Prescription update accepted',
      buttonLabel: 'View Plan Adjustment',
    })
  })

  test('keeps declined and expired adjustments viewable as history', () => {
    expect(
      getPlanAdjustmentHandoffState({ status: 'declined' }),
    ).toMatchObject({
      state: 'declined',
      buttonLabel: 'View Plan Adjustment',
    })

    expect(
      getPlanAdjustmentHandoffState({ status: 'expired' }),
    ).toMatchObject({
      state: 'expired',
      buttonLabel: 'View Plan Adjustment',
    })
  })

})
