// @vitest-environment jsdom

import {
  act,
  renderHook,
} from '@testing-library/react'
import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  createCoachingPlan: vi.fn(),
  saveCheckInSettings: vi.fn(),
  getTodayDateKey: vi.fn(
    () => '2026-08-15',
  ),
  getBrowserTimeZone: vi.fn(
    () => 'America/Chicago',
  ),
}))

vi.mock(
  '../services/createPlanService',
  () => ({
    createCoachingPlan:
      mocks.createCoachingPlan,
  }),
)

vi.mock(
  '../services/checkInSettingsService',
  () => ({
    saveCheckInSettings:
      mocks.saveCheckInSettings,
  }),
)

vi.mock('../utils/dates', () => ({
  getTodayDateKey:
    mocks.getTodayDateKey,
}))

vi.mock('../utils/timeZone', () => ({
  getBrowserTimeZone:
    mocks.getBrowserTimeZone,
}))

import {
  useCreatePlan,
} from './useCreatePlan'

function fillValidPlan(result) {
  const fields = {
    goal: 'fat_loss',
    body_fat_source: 'none',
    track_water: false,
    track_alcohol: false,
    start_date: '2026-08-16',
    nutrition_target_method:
      'macros_known',
    protein_grams: '165',
    carb_grams: '125',
    fat_grams: '60',
    weekly_workout_target: '3',
    weekly_cardio_target_minutes: '90',
  }

  act(() => {
    for (const [field, value] of Object.entries(
      fields,
    )) {
      result.current.setField(
        field,
        value,
      )
    }
  })
}

describe('useCreatePlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-15',
    )
    mocks.createCoachingPlan.mockResolvedValue(
      'plan-123',
    )
    mocks.saveCheckInSettings.mockResolvedValue(
      undefined,
    )
  })

  test('starts with the intended Create Plan defaults', () => {
    const { result } = renderHook(() =>
      useCreatePlan('user-1'),
    )

    expect(result.current.today).toBe(
      '2026-08-15',
    )
    expect(result.current.form).toMatchObject({
      goal: '',
      unit_system: 'imperial',
      body_fat_source: '',
      track_water: null,
      track_alcohol: null,
      start_date: '',
      program_length_weeks: '12',
      checkin_day: '',
      nutrition_target_method: '',
      calorie_target: '',
      weekly_workout_target: '',
      weekly_cardio_target_minutes: '',
      measurement_frequency_weeks: '1',
      photo_frequency_weeks: '4',
      time_zone: 'America/Chicago',
    })
    expect(result.current.saving).toBe(false)
    expect(result.current.error).toBe('')
    expect(
      result.current.createdPlanId,
    ).toBeNull()
  })

  test('automatically matches check-in day to Start Day until the user changes it', () => {
    const { result } = renderHook(() =>
      useCreatePlan('user-1'),
    )

    act(() => {
      result.current.setField(
        'start_date',
        '2026-08-16',
      )
    })

    // August 16, 2026 is Sunday.
    expect(
      result.current.form.checkin_day,
    ).toBe(0)

    act(() => {
      result.current.setField(
        'start_date',
        '2026-08-17',
      )
    })

    // August 17, 2026 is Monday.
    expect(
      result.current.form.checkin_day,
    ).toBe(1)
  })

  test('stops auto-changing check-in day after the user explicitly chooses one', () => {
    const { result } = renderHook(() =>
      useCreatePlan('user-1'),
    )

    act(() => {
      result.current.setField(
        'checkin_day',
        '5',
      )
    })

    act(() => {
      result.current.setField(
        'start_date',
        '2026-08-17',
      )
    })

    expect(
      result.current.form.checkin_day,
    ).toBe('5')
  })

  test('recalculates calories whenever a macro changes', () => {
    const { result } = renderHook(() =>
      useCreatePlan('user-1'),
    )

    act(() => {
      result.current.setField(
        'protein_grams',
        '165',
      )
      result.current.setField(
        'carb_grams',
        '125',
      )
      result.current.setField(
        'fat_grams',
        '60',
      )
    })

    expect(
      result.current.form.calorie_target,
    ).toBe('1700')
  })

  test('clears an existing error when a field changes', async () => {
    const { result } = renderHook(() =>
      useCreatePlan('user-1'),
    )

    await act(async () => {
      await result.current.savePlan()
    })

    expect(result.current.error).toBe(
      'Choose your coaching goal.',
    )

    act(() => {
      result.current.setField(
        'goal',
        'fat_loss',
      )
    })

    expect(result.current.error).toBe('')
  })

  test('returns the first invalid wizard step without calling services', async () => {
    const { result } = renderHook(() =>
      useCreatePlan('user-1'),
    )

    let response

    await act(async () => {
      response =
        await result.current.savePlan()
    })

    expect(response).toEqual({
      saved: false,
      invalidStep: 'goal',
    })
    expect(
      mocks.saveCheckInSettings,
    ).not.toHaveBeenCalled()
    expect(
      mocks.createCoachingPlan,
    ).not.toHaveBeenCalled()
  })

  test('saves Check-In settings before creating the coaching plan', async () => {
    const onSaved = vi.fn()
    const { result } = renderHook(() =>
      useCreatePlan(
        'user-1',
        onSaved,
      ),
    )

    fillValidPlan(result)

    let response

    await act(async () => {
      response =
        await result.current.savePlan()
    })

    expect(response).toEqual({
      saved: true,
      invalidStep: null,
    })

    expect(
      mocks.saveCheckInSettings,
    ).toHaveBeenCalledWith(
      'user-1',
      {
        track_water: false,
        track_alcohol: false,
        body_fat_source: 'none',
      },
    )

    expect(
      mocks.createCoachingPlan,
    ).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        goal: 'fat_loss',
        start_date: '2026-08-16',
        checkin_day: 0,
        calorie_target: '1700',
        protein_grams: '165',
        carb_grams: '125',
        fat_grams: '60',
      }),
    )

    expect(
      mocks.saveCheckInSettings.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      mocks.createCoachingPlan.mock
        .invocationCallOrder[0],
    )

    expect(
      result.current.createdPlanId,
    ).toBe('plan-123')
    expect(onSaved).toHaveBeenCalledOnce()
    expect(result.current.error).toBe('')
    expect(result.current.saving).toBe(
      false,
    )
  })

  test('surfaces a settings-save failure and does not create a plan', async () => {
    mocks.saveCheckInSettings.mockRejectedValue(
      new Error('Settings failed'),
    )

    const { result } = renderHook(() =>
      useCreatePlan('user-1'),
    )

    fillValidPlan(result)

    let response

    await act(async () => {
      response =
        await result.current.savePlan()
    })

    expect(response).toEqual({
      saved: false,
      invalidStep: null,
    })
    expect(result.current.error).toBe(
      'Settings failed',
    )
    expect(
      mocks.createCoachingPlan,
    ).not.toHaveBeenCalled()
    expect(result.current.saving).toBe(
      false,
    )
  })

  test('surfaces a plan-create failure after settings save', async () => {
    mocks.createCoachingPlan.mockRejectedValue(
      new Error('Plan failed'),
    )

    const { result } = renderHook(() =>
      useCreatePlan('user-1'),
    )

    fillValidPlan(result)

    let response

    await act(async () => {
      response =
        await result.current.savePlan()
    })

    expect(response).toEqual({
      saved: false,
      invalidStep: null,
    })
    expect(result.current.error).toBe(
      'Plan failed',
    )
    expect(
      mocks.saveCheckInSettings,
    ).toHaveBeenCalledOnce()
    expect(result.current.saving).toBe(
      false,
    )
  })
})
