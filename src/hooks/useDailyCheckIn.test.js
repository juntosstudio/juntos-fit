// @vitest-environment jsdom

import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react'
import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  deleteDailyCheckInDraft: vi.fn(),
  loadDailyCheckInDraft: vi.fn(),
  loadDailyCheckInForDate: vi.fn(),
  loadTodayDailyCheckIn: vi.fn(),
  saveDailyCheckInDraft: vi.fn(),
  saveDailyCheckInForDate: vi.fn(),
  saveTodayDailyCheckIn: vi.fn(),
  getTodayDateKey: vi.fn(
    () => '2026-08-15',
  ),
}))

vi.mock(
  '../services/dailyCheckInService',
  () => ({
    deleteDailyCheckInDraft:
      mocks.deleteDailyCheckInDraft,
    loadDailyCheckInDraft:
      mocks.loadDailyCheckInDraft,
    loadDailyCheckInForDate:
      mocks.loadDailyCheckInForDate,
    loadTodayDailyCheckIn:
      mocks.loadTodayDailyCheckIn,
    saveDailyCheckInDraft:
      mocks.saveDailyCheckInDraft,
    saveDailyCheckInForDate:
      mocks.saveDailyCheckInForDate,
    saveTodayDailyCheckIn:
      mocks.saveTodayDailyCheckIn,
  }),
)

vi.mock(
  '../utils/dates',
  async (importOriginal) => {
    const actual = await importOriginal()

    return {
      ...actual,
      getTodayDateKey:
        mocks.getTodayDateKey,
    }
  },
)

import {
  useDailyCheckIn,
} from './useDailyCheckIn'

const activePlan = {
  id: 'plan-1',
  start_date: '2026-08-14',
}

const trackingOff = {
  track_water: false,
  track_alcohol: false,
}

const trackingOn = {
  track_water: true,
  track_alcohol: true,
}

const validLoadedCheckIn = {
  id: 'daily-1',
  morning_weight: 150,
  weight_status: 'recorded',
  meal_plan_score: 5,
  meal_plan_deviation_details: null,
  planned_cheat_meal_status: null,
  hunger_score: 3,
  water_goal_met: true,
  workout_status: 'rest',
  workout_incomplete_reason: null,
  training_problem: null,
  training_problem_details: null,
  cardio_minutes: 0,
  alcohol_consumed: false,
  alcohol_details: null,
  additional_notes: null,
  questions_for_coach: null,
}

function fillBasicValidForm(result) {
  act(() => {
    result.current.setField(
      'weight_status',
      'recorded',
    )
    result.current.setField(
      'morning_weight',
      '150',
    )
    result.current.setField(
      'meal_plan_score',
      '5',
    )
    result.current.setField(
      'hunger_score',
      '3',
    )
    result.current.setField(
      'workout_status',
      'rest',
    )
    result.current.setField(
      'cardio_minutes',
      '0',
    )
  })
}

describe('useDailyCheckIn availability and loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-15',
    )
    mocks.loadDailyCheckInForDate.mockResolvedValue(
      null,
    )
    mocks.loadTodayDailyCheckIn.mockResolvedValue(
      null,
    )
    mocks.loadDailyCheckInDraft.mockResolvedValue(
      null,
    )
    mocks.deleteDailyCheckInDraft.mockResolvedValue(
      undefined,
    )
    mocks.saveDailyCheckInForDate.mockImplementation(
      async (_date, values) => ({
        id: 'daily-saved',
        ...values,
      }),
    )
    mocks.saveTodayDailyCheckIn.mockImplementation(
      async (values) => ({
        id: 'daily-saved',
        ...values,
      }),
    )
  })

  test('starts Daily Check-Ins the morning after plan Start Day', async () => {
    const plan = {
      id: 'plan-1',
      start_date: '2026-08-15',
    }

    const { result } = renderHook(() =>
      useDailyCheckIn(
        plan,
        undefined,
        trackingOff,
      ),
    )

    expect(
      result.current.firstCheckInDate,
    ).toBe('2026-08-16')
    expect(
      result.current.planHasStarted,
    ).toBe(false)
    expect(result.current.canEdit).toBe(
      false,
    )

    await waitFor(() => {
      expect(
        mocks.loadTodayDailyCheckIn,
      ).not.toHaveBeenCalled()
    })
  })

  test('loads today’s saved Daily Check-In once the plan is active', async () => {
    mocks.loadTodayDailyCheckIn.mockResolvedValue({
      ...validLoadedCheckIn,
      morning_weight: 151.2,
      meal_plan_score: 3,
      planned_cheat_meal_status:
        'eaten',
      meal_plan_deviation_details:
        'Dessert after dinner',
      hunger_score: 4,
      workout_status: 'completed',
      training_problem: false,
      cardio_minutes: 20,
      additional_notes:
        'Energy was good.',
      questions_for_coach:
        'Should I add cardio?',
    })

    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOn,
      ),
    )

    await waitFor(() => {
      expect(
        mocks.loadTodayDailyCheckIn,
      ).toHaveBeenCalledWith('plan-1')
    })

    await waitFor(() => {
      expect(
        result.current.form.morning_weight,
      ).toBe('151.2')
    })

    expect(
      result.current.form.meal_plan_score,
    ).toBe('3')
    expect(
      result.current.form
        .meal_plan_deviation_type,
    ).toBe('cheat_plus')
    expect(
      result.current.form.hunger_score,
    ).toBe('4')
    expect(
      result.current.form.cardio_minutes,
    ).toBe('20')
    expect(
      result.current.form.coach_notes,
    ).toBe(
      'Energy was good.\n\nShould I add cardio?',
    )
    expect(result.current.isDirty).toBe(
      false,
    )
    expect(result.current.canEdit).toBe(
      true,
    )
  })

  test('derives cheat-only when a saved cheat meal has no extra deviation details', async () => {
    mocks.loadTodayDailyCheckIn.mockResolvedValue({
      ...validLoadedCheckIn,
      meal_plan_score: 4,
      planned_cheat_meal_status:
        'eaten',
      meal_plan_deviation_details: null,
    })

    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    await waitFor(() => {
      expect(
        result.current.form
          .meal_plan_deviation_type,
      ).toBe('cheat_only')
    })
  })

  test('derives no-cheat for a non-perfect saved score without an eaten cheat meal', async () => {
    mocks.loadTodayDailyCheckIn.mockResolvedValue({
      ...validLoadedCheckIn,
      meal_plan_score: 3,
      planned_cheat_meal_status:
        'not_eaten',
      meal_plan_deviation_details:
        'Unplanned snack',
    })

    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    await waitFor(() => {
      expect(
        result.current.form
          .meal_plan_deviation_type,
      ).toBe('no_cheat')
    })
  })
})

describe('useDailyCheckIn autosave draft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-15',
    )
    mocks.loadTodayDailyCheckIn.mockResolvedValue(
      null,
    )
    mocks.loadDailyCheckInDraft.mockResolvedValue({
      id: 'draft-1',
      coaching_plan_id: 'plan-1',
      checkin_date: '2026-08-15',
      resume_step: 'cardio',
      draft_data: {
        weight_status: 'recorded',
        morning_weight: '150',
        cardio_minutes: '0',
      },
    })
    mocks.saveDailyCheckInDraft.mockImplementation(
      async (_planId, _date, values) => ({
        id: 'draft-1',
        resume_step: values.resumeStep,
        draft_data: values.form,
      }),
    )
    mocks.deleteDailyCheckInDraft.mockResolvedValue(
      undefined,
    )
    mocks.saveTodayDailyCheckIn.mockImplementation(
      async (values) => ({
        id: 'daily-saved',
        ...values,
      }),
    )
  })

  test('loads saved draft form and resume step when no completed Daily exists', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(
        true,
      )
    })

    expect(result.current.resumeStep).toBe(
      'cardio',
    )
    expect(
      result.current.form.morning_weight,
    ).toBe('150')
  })

  test('autosaves exact form JSON without creating a completed Daily row', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(
        true,
      )
    })

    act(() => {
      result.current.setField(
        'coach_notes',
        'Still working on this',
      )
    })

    let saved
    await act(async () => {
      saved = await result.current.saveDraft(
        'notes',
      )
    })

    expect(saved).toBe(true)
    expect(
      mocks.saveDailyCheckInDraft,
    ).toHaveBeenCalledWith(
      'plan-1',
      '2026-08-15',
      expect.objectContaining({
        resumeStep: 'notes',
        form: expect.objectContaining({
          coach_notes:
            'Still working on this',
        }),
      }),
    )
    expect(
      mocks.saveTodayDailyCheckIn,
    ).not.toHaveBeenCalled()
  })
})

describe('useDailyCheckIn historical editing', () => {
  const historicalPlan = {
    id: 'plan-1',
    start_date: '2026-08-12',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-15',
    )
    mocks.loadDailyCheckInForDate.mockResolvedValue({
      ...validLoadedCheckIn,
      id: 'daily-historical',
      checkin_date: '2026-08-13',
      morning_weight: 149.5,
    })
    mocks.loadTodayDailyCheckIn.mockResolvedValue(
      null,
    )
    mocks.loadDailyCheckInDraft.mockResolvedValue(
      null,
    )
    mocks.deleteDailyCheckInDraft.mockResolvedValue(
      undefined,
    )
    mocks.saveDailyCheckInForDate.mockImplementation(
      async (_date, values) => ({
        id: 'daily-historical',
        ...values,
      }),
    )
  })

  test('loads the requested historical Daily instead of today', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        historicalPlan,
        undefined,
        trackingOff,
        '2026-08-13',
      ),
    )

    await waitFor(() => {
      expect(
        mocks.loadDailyCheckInForDate,
      ).toHaveBeenCalledWith(
        'plan-1',
        '2026-08-13',
      )
    })

    expect(
      mocks.loadTodayDailyCheckIn,
    ).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('daily-historical')
    })

    expect(
      result.current.checkInDate,
    ).toBe('2026-08-13')
  })

  test('saves changes back to the same historical date', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        historicalPlan,
        undefined,
        trackingOff,
        '2026-08-13',
      ),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('daily-historical')
    })

    act(() => {
      result.current.setField(
        'hunger_score',
        '4',
      )
    })

    let saved
    await act(async () => {
      saved =
        await result.current.saveCheckIn()
    })

    expect(saved).toBe(true)
    expect(
      mocks.saveDailyCheckInForDate,
    ).toHaveBeenCalledWith(
      '2026-08-13',
      expect.objectContaining({
        coaching_plan_id: 'plan-1',
        checkin_date: '2026-08-13',
        hunger_score: 4,
      }),
    )
    expect(
      mocks.saveTodayDailyCheckIn,
    ).not.toHaveBeenCalled()
  })
})

describe('useDailyCheckIn editing and validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-15',
    )
    mocks.loadDailyCheckInForDate.mockResolvedValue(
      null,
    )
    mocks.loadTodayDailyCheckIn.mockResolvedValue(
      null,
    )
    mocks.loadDailyCheckInDraft.mockResolvedValue(
      null,
    )
    mocks.deleteDailyCheckInDraft.mockResolvedValue(
      undefined,
    )
    mocks.saveDailyCheckInForDate.mockImplementation(
      async (_date, values) => ({
        id: 'daily-saved',
        ...values,
      }),
    )
    mocks.saveTodayDailyCheckIn.mockImplementation(
      async (values) => ({
        id: 'daily-saved',
        ...values,
      }),
    )
  })

  test('marks the form dirty when an answer changes', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    expect(result.current.isDirty).toBe(
      false,
    )

    act(() => {
      result.current.setField(
        'hunger_score',
        '4',
      )
    })

    expect(result.current.isDirty).toBe(
      true,
    )
  })

  test('clears an existing validation error when the user edits a field', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(result.current.error).toBe(
      'Enter your morning weight or choose why you do not have one today.',
    )

    act(() => {
      result.current.setField(
        'weight_status',
        'recorded',
      )
    })

    expect(result.current.error).toBe('')
  })

  test('blocks saving before the first Daily Check-In date', async () => {
    const plan = {
      id: 'plan-1',
      start_date: '2026-08-15',
    }

    const { result } = renderHook(() =>
      useDailyCheckIn(
        plan,
        undefined,
        trackingOff,
      ),
    )

    let saved

    await act(async () => {
      saved =
        await result.current.saveCheckIn()
    })

    expect(saved).toBe(false)
    expect(result.current.error).toContain(
      'Daily check-ins begin the morning after your program starts.',
    )
    expect(
      mocks.saveTodayDailyCheckIn,
    ).not.toHaveBeenCalled()
  })
})

describe('useDailyCheckIn save payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-15',
    )
    mocks.loadDailyCheckInForDate.mockResolvedValue(
      null,
    )
    mocks.loadTodayDailyCheckIn.mockResolvedValue(
      null,
    )
    mocks.loadDailyCheckInDraft.mockResolvedValue(
      null,
    )
    mocks.deleteDailyCheckInDraft.mockResolvedValue(
      undefined,
    )
    mocks.saveDailyCheckInForDate.mockImplementation(
      async (_date, values) => ({
        id: 'daily-saved',
        ...values,
      }),
    )
    mocks.saveTodayDailyCheckIn.mockImplementation(
      async (values) => ({
        id: 'daily-saved',
        ...values,
      }),
    )
  })

  test('saves a normal Daily record and clears irrelevant conditional fields', async () => {
    const onSaved = vi.fn()

    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        onSaved,
        trackingOff,
      ),
    )

    fillBasicValidForm(result)

    act(() => {
      result.current.setField(
        'meal_plan_deviation_details',
        'Old detail that should not save',
      )
      result.current.setField(
        'workout_incomplete_reason',
        'Old missed-workout reason',
      )
      result.current.setField(
        'training_problem',
        true,
      )
      result.current.setField(
        'training_problem_details',
        'Old training detail',
      )
      result.current.setField(
        'coach_notes',
        '  Felt strong today.  ',
      )
    })

    let saved

    await act(async () => {
      saved =
        await result.current.saveCheckIn()
    })

    expect(saved).toBe(true)

    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        coaching_plan_id: 'plan-1',
        checkin_date: '2026-08-15',
        morning_weight: 150,
        weight_status: 'recorded',
        meal_plan_score: 5,
        meal_plan_deviation_details: null,
        planned_cheat_meal_status: null,
        hunger_score: 3,
        workout_status: 'rest',
        workout_incomplete_reason: null,
        training_problem: null,
        training_problem_details: null,
        cardio_minutes: 0,
        additional_notes:
          'Felt strong today.',
        questions_for_coach: null,
      }),
    )

    expect(onSaved).toHaveBeenCalledOnce()
    expect(
      result.current.successMessage,
    ).toBe('Today’s check-in was saved.')
    expect(result.current.isDirty).toBe(
      false,
    )
  })

  test('saves cheat-only as an eaten planned cheat without extra deviation details', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    fillBasicValidForm(result)

    act(() => {
      result.current.setField(
        'meal_plan_score',
        '3',
      )
      result.current.setField(
        'meal_plan_deviation_type',
        'cheat_only',
      )
      result.current.setField(
        'meal_plan_deviation_details',
        'This should be ignored',
      )
    })

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        meal_plan_score: 3,
        planned_cheat_meal_status:
          'eaten',
        meal_plan_deviation_details:
          null,
      }),
    )
  })

  test('saves non-cheat deviations with details and not-eaten cheat status', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    fillBasicValidForm(result)

    act(() => {
      result.current.setField(
        'meal_plan_score',
        '3',
      )
      result.current.setField(
        'meal_plan_deviation_type',
        'no_cheat',
      )
      result.current.setField(
        'meal_plan_deviation_details',
        '  Had an unplanned snack.  ',
      )
    })

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        planned_cheat_meal_status:
          'not_eaten',
        meal_plan_deviation_details:
          'Had an unplanned snack.',
      }),
    )
  })

  test('saves missed-workout reason and clears training-problem fields', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    fillBasicValidForm(result)

    act(() => {
      result.current.setField(
        'workout_status',
        'missed',
      )
      result.current.setField(
        'workout_incomplete_reason',
        '  Sick today.  ',
      )
      result.current.setField(
        'training_problem',
        true,
      )
      result.current.setField(
        'training_problem_details',
        'Should not save',
      )
    })

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        workout_status: 'missed',
        workout_incomplete_reason:
          'Sick today.',
        training_problem: null,
        training_problem_details: null,
      }),
    )
  })

  test('saves training-problem details only for an attempted workout with a reported problem', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    fillBasicValidForm(result)

    act(() => {
      result.current.setField(
        'workout_status',
        'partial',
      )
      result.current.setField(
        'training_problem',
        true,
      )
      result.current.setField(
        'training_problem_details',
        '  Right shoulder hurt.  ',
      )
    })

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        workout_status: 'partial',
        workout_incomplete_reason: null,
        training_problem: true,
        training_problem_details:
          'Right shoulder hurt.',
      }),
    )
  })

  test('preserves previously saved water and alcohol data when those trackers are turned off', async () => {
    mocks.loadTodayDailyCheckIn.mockResolvedValue({
      ...validLoadedCheckIn,
      water_goal_met: true,
      alcohol_consumed: true,
      alcohol_details:
        '2 glasses of wine',
    })

    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('daily-1')
    })

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        water_goal_met: true,
        alcohol_consumed: true,
        alcohol_details:
          '2 glasses of wine',
      }),
    )
  })

  test('uses current water and alcohol answers when tracking is enabled', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOn,
      ),
    )

    fillBasicValidForm(result)

    act(() => {
      result.current.setField(
        'water_goal_met',
        false,
      )
      result.current.setField(
        'alcohol_consumed',
        false,
      )
      result.current.setField(
        'alcohol_details',
        'Old value',
      )
    })

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        water_goal_met: false,
        alcohol_consumed: false,
        alcohol_details: null,
      }),
    )
  })

  test('saves alcohol details only when alcohol tracking is enabled and alcohol was consumed', async () => {
    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOn,
      ),
    )

    fillBasicValidForm(result)

    act(() => {
      result.current.setField(
        'water_goal_met',
        true,
      )
      result.current.setField(
        'alcohol_consumed',
        true,
      )
      result.current.setField(
        'alcohol_details',
        '  1 vodka soda  ',
      )
    })

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        alcohol_consumed: true,
        alcohol_details:
          '1 vodka soda',
      }),
    )
  })

  test('surfaces a save-service failure and leaves saving false', async () => {
    mocks.saveTodayDailyCheckIn.mockRejectedValue(
      new Error('Daily save failed'),
    )

    const { result } = renderHook(() =>
      useDailyCheckIn(
        activePlan,
        undefined,
        trackingOff,
      ),
    )

    fillBasicValidForm(result)

    let saved

    await act(async () => {
      saved =
        await result.current.saveCheckIn()
    })

    expect(saved).toBe(false)
    expect(result.current.error).toBe(
      'Daily save failed',
    )
    expect(result.current.saving).toBe(
      false,
    )
  })
})
