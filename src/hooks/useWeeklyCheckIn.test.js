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
  getTodayDateKey: vi.fn(
    () => '2026-08-16',
  ),
  getWeeklyCheckInNumber: vi.fn(
    () => 2,
  ),
  getPreviewWeeklyCheckInNumber: vi.fn(
    () => 2,
  ),
  isFullWeeklyMeasurementCheckIn: vi.fn(
    () => false,
  ),
  calculateRfmBodyFatEstimate: vi.fn(),
  loadWeeklyBodyFatProfile: vi.fn(),
  completeWeeklyCheckIn: vi.fn(),
  createWeeklyCheckInDraft: vi.fn(),
  saveWeeklyCheckInDraft: vi.fn(),
  loadWeeklyCheckInPhotos: vi.fn(),
  uploadWeeklyCheckInPhoto: vi.fn(),
  loadLastCardioContext: vi.fn(),
  saveTodayDailyCheckIn: vi.fn(),
}))

vi.mock('../utils/dates', () => ({
  getTodayDateKey:
    mocks.getTodayDateKey,
}))

vi.mock(
  '../utils/weeklyCheckInFlow',
  async (importOriginal) => {
    const actual = await importOriginal()

    return {
      ...actual,
      getWeeklyCheckInNumber:
        mocks.getWeeklyCheckInNumber,
      getPreviewWeeklyCheckInNumber:
        mocks.getPreviewWeeklyCheckInNumber,
      isFullWeeklyMeasurementCheckIn:
        mocks.isFullWeeklyMeasurementCheckIn,
    }
  },
)

vi.mock('../utils/bodyFat', () => ({
  calculateRfmBodyFatEstimate:
    mocks.calculateRfmBodyFatEstimate,
}))

vi.mock(
  '../services/weeklyCheckInPreviewService',
  () => ({
    loadWeeklyBodyFatProfile:
      mocks.loadWeeklyBodyFatProfile,
  }),
)

vi.mock(
  '../services/weeklyCheckInService',
  () => ({
    completeWeeklyCheckIn:
      mocks.completeWeeklyCheckIn,
    createWeeklyCheckInDraft:
      mocks.createWeeklyCheckInDraft,
    saveWeeklyCheckInDraft:
      mocks.saveWeeklyCheckInDraft,
  }),
)

vi.mock(
  '../services/weeklyCheckInPhotoService',
  () => ({
    loadWeeklyCheckInPhotos:
      mocks.loadWeeklyCheckInPhotos,
    uploadWeeklyCheckInPhoto:
      mocks.uploadWeeklyCheckInPhoto,
  }),
)

vi.mock(
  '../services/dailyCheckInService',
  () => ({
    loadLastCardioContext:
      mocks.loadLastCardioContext,
    saveTodayDailyCheckIn:
      mocks.saveTodayDailyCheckIn,
  }),
)

import {
  WEEKLY_CHECKIN_STEP_IDS,
} from '../utils/weeklyCheckInFlow'
import {
  useWeeklyCheckIn,
} from './useWeeklyCheckIn'

const plan = {
  id: 'plan-1',
  user_id: 'user-1',
  start_date: '2026-08-02',
  checkin_day: 0,
  program_length_weeks: '12',
  photo_frequency_weeks: '4',
  measurement_side: 'right',
}

const profile = {
  height_cm: 170,
  sex: 'female',
}

const draft = {
  id: 'weekly-1',
  status: 'draft',
  week_number: 2,
  photos_required: false,
  body_fat_source: 'none',
  draft_data: null,
  resume_step:
    WEEKLY_CHECKIN_STEP_IDS.GET_STARTED,
}

function setSubmissionFields(result) {
  act(() => {
    const fields = {
      morning_weight: '150.5',
      weight_status: 'recorded',
      meal_plan_score: '4',
      meal_plan_deviation_details:
        '  Extra snack.  ',
      planned_cheat_meal_status:
        'not_eaten',
      hunger_score: '3',
      water_goal_met: true,
      workout_status: 'completed',
      training_problem: false,
      cardio_minutes: '20',
      cardio_type: 'walking',
      cardio_intensity: 'moderate',
      alcohol_consumed: false,
      sleep_quality: '4',
      energy_level: '4',
      recovery_score: '3',
      stress_level: '2',
      waist_inches: '32',
      weekly_reflection:
        '  Strong week overall.  ',
    }

    for (const [field, value] of Object.entries(
      fields,
    )) {
      result.current.setField(field, value)
    }
  })
}

beforeEach(() => {
  mocks.loadLastCardioContext.mockResolvedValue(
    null,
  )
})

describe('useWeeklyCheckIn load and preview behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-16',
    )
    mocks.getWeeklyCheckInNumber.mockReturnValue(
      2,
    )
    mocks.getPreviewWeeklyCheckInNumber.mockReturnValue(
      2,
    )
    mocks.isFullWeeklyMeasurementCheckIn.mockReturnValue(
      false,
    )
    mocks.loadWeeklyBodyFatProfile.mockResolvedValue(
      profile,
    )
    mocks.createWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
    })
    mocks.loadWeeklyCheckInPhotos.mockResolvedValue(
      [],
    )
    mocks.saveWeeklyCheckInDraft.mockImplementation(
      async (_id, values) => ({
        ...draft,
        draft_data: values.form,
        resume_step: values.resumeStep,
      }),
    )
    mocks.saveTodayDailyCheckIn.mockResolvedValue({
      id: 'daily-1',
    })
    mocks.completeWeeklyCheckIn.mockResolvedValue({
      ...draft,
      status: 'completed',
    })
    mocks.uploadWeeklyCheckInPhoto.mockResolvedValue(
      undefined,
    )
    mocks.calculateRfmBodyFatEstimate.mockReturnValue(
      null,
    )
  })

  test('creates a persistent Weekly draft on an exact scheduled check-in date', async () => {
    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        mocks.createWeeklyCheckInDraft,
      ).toHaveBeenCalledWith({
        userId: 'user-1',
        coachingPlanId: 'plan-1',
        checkinDate: '2026-08-16',
        weekNumber: 2,
        photosRequired: false,
        bodyFatSource: 'none',
      })
    })

    expect(
      result.current.persistenceEnabled,
    ).toBe(true)
    expect(result.current.weekNumber).toBe(
      2,
    )
    expect(
      result.current.photosRequired,
    ).toBe(false)
  })

  test('prefills a new Weekly draft with the most recent cardio type and effort', async () => {
    mocks.loadLastCardioContext.mockResolvedValue({
      cardio_type: 'cycling',
      cardio_intensity: 'hard',
    })

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        result.current.form.cardio_type,
      ).toBe('cycling')
    })

    expect(
      result.current.form.cardio_intensity,
    ).toBe('hard')
    expect(
      mocks.loadLastCardioContext,
    ).toHaveBeenCalledWith(
      'plan-1',
      '2026-08-16',
    )
  })

  test('uses preview mode when today is not an exact Weekly date', async () => {
    mocks.getWeeklyCheckInNumber.mockReturnValue(
      null,
    )
    mocks.getPreviewWeeklyCheckInNumber.mockReturnValue(
      3,
    )

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        mocks.loadWeeklyBodyFatProfile,
      ).toHaveBeenCalledWith('user-1')
    })

    expect(
      result.current.persistenceEnabled,
    ).toBe(false)
    expect(result.current.weekNumber).toBe(
      3,
    )
    expect(
      result.current.existingCheckIn,
    ).toBeNull()
    expect(
      mocks.createWeeklyCheckInDraft,
    ).not.toHaveBeenCalled()
  })

  test('caps preview week number at the plan length', async () => {
    mocks.getWeeklyCheckInNumber.mockReturnValue(
      null,
    )
    mocks.getPreviewWeeklyCheckInNumber.mockReturnValue(
      15,
    )

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        mocks.loadWeeklyBodyFatProfile,
      ).toHaveBeenCalled()
    })

    expect(result.current.weekNumber).toBe(
      12,
    )
    expect(
      result.current.isFinalWeekly,
    ).toBe(true)
  })

  test('does not persist an exact week beyond the configured plan length', async () => {
    mocks.getWeeklyCheckInNumber.mockReturnValue(
      13,
    )
    mocks.getPreviewWeeklyCheckInNumber.mockReturnValue(
      13,
    )

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        mocks.loadWeeklyBodyFatProfile,
      ).toHaveBeenCalled()
    })

    expect(
      result.current.persistenceEnabled,
    ).toBe(false)
    expect(result.current.weekNumber).toBe(
      12,
    )
    expect(
      mocks.createWeeklyCheckInDraft,
    ).not.toHaveBeenCalled()
  })

  test('loads saved draft data, photos, and resume step', async () => {
    mocks.createWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
      draft_data: {
        waist_inches: '31.5',
        weekly_reflection:
          'Saved reflection',
      },
      resume_step:
        WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
    })
    mocks.loadWeeklyCheckInPhotos.mockResolvedValue([
      {
        id: 'front-1',
        pose: 'front',
      },
    ])

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        result.current.form.waist_inches,
      ).toBe('31.5')
    })

    expect(result.current.resumeStep).toBe(
      WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
    )
    expect(
      result.current.photos.front?.id,
    ).toBe('front-1')
  })

  test('loads a completed check-in directly into review mode', async () => {
    mocks.createWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
      status: 'completed',
      body_fat_source:
        'juntos_estimate',
      body_fat_percent: 29.4,
      body_fat_method: 'rfm_v1',
    })

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'scale',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(result.current.isCompleted).toBe(
        true,
      )
    })

    expect(result.current.resumeStep).toBe(
      'review',
    )
    expect(
      result.current.reviewBodyFatSource,
    ).toBe('juntos_estimate')
    expect(
      result.current.reviewEstimatedBodyFat,
    ).toEqual({
      percent: 29.4,
      formulaVersion: 'rfm_v1',
    })
  })
})

describe('useWeeklyCheckIn body-fat state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-16',
    )
    mocks.getWeeklyCheckInNumber.mockReturnValue(
      2,
    )
    mocks.getPreviewWeeklyCheckInNumber.mockReturnValue(
      2,
    )
    mocks.isFullWeeklyMeasurementCheckIn.mockReturnValue(
      false,
    )
    mocks.loadWeeklyBodyFatProfile.mockResolvedValue(
      profile,
    )
    mocks.createWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
    })
    mocks.loadWeeklyCheckInPhotos.mockResolvedValue(
      [],
    )
    mocks.calculateRfmBodyFatEstimate.mockReturnValue({
      percent: 29.8,
      formulaVersion: 'rfm_v1',
    })
  })

  test('uses RFM estimator for Juntos-estimate Weekly body fat', async () => {
    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource:
          'juntos_estimate',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        mocks.loadWeeklyBodyFatProfile,
      ).toHaveBeenCalled()
    })

    act(() => {
      result.current.setField(
        'waist_inches',
        '32',
      )
    })

    await waitFor(() => {
      expect(
        mocks.calculateRfmBodyFatEstimate,
      ).toHaveBeenCalledWith({
        waistInches: 32,
        heightCm: 170,
        sex: 'female',
      })
    })

    expect(
      result.current.estimatedBodyFat,
    ).toEqual({
      percent: 29.8,
      formulaVersion: 'rfm_v1',
    })
    expect(
      result.current.form.body_fat_status,
    ).toBe('estimated')
  })

  test('switching away from scale clears stale scale body-fat value', async () => {
    const { result, rerender } = renderHook(
      ({ bodyFatSource }) =>
        useWeeklyCheckIn(plan, {
          bodyFatSource,
          unitSystem: 'imperial',
        }),
      {
        initialProps: {
          bodyFatSource: 'scale',
        },
      },
    )

    await waitFor(() => {
      expect(
        mocks.createWeeklyCheckInDraft,
      ).toHaveBeenCalled()
    })

    act(() => {
      result.current.setField(
        'body_fat_status',
        'recorded',
      )
      result.current.setField(
        'scale_body_fat_percent',
        '30.1',
      )
    })

    rerender({
      bodyFatSource: 'none',
    })

    await waitFor(() => {
      expect(
        result.current.form.body_fat_status,
      ).toBe('not_tracked')
    })

    expect(
      result.current.form
        .scale_body_fat_percent,
    ).toBe('')
  })

  test('does not allow field edits after completion', async () => {
    mocks.createWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
      status: 'completed',
      draft_data: {
        weekly_reflection:
          'Original',
      },
    })

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(result.current.isCompleted).toBe(
        true,
      )
    })

    act(() => {
      result.current.setField(
        'weekly_reflection',
        'Changed',
      )
    })

    expect(
      result.current.form.weekly_reflection,
    ).toBe('Original')
  })
})

describe('useWeeklyCheckIn draft saving', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-16',
    )
    mocks.getWeeklyCheckInNumber.mockReturnValue(
      2,
    )
    mocks.getPreviewWeeklyCheckInNumber.mockReturnValue(
      2,
    )
    mocks.isFullWeeklyMeasurementCheckIn.mockReturnValue(
      false,
    )
    mocks.loadWeeklyBodyFatProfile.mockResolvedValue(
      profile,
    )
    mocks.createWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
    })
    mocks.loadWeeklyCheckInPhotos.mockResolvedValue(
      [],
    )
    mocks.saveWeeklyCheckInDraft.mockImplementation(
      async (_id, values) => ({
        ...draft,
        draft_data: values.form,
        resume_step: values.resumeStep,
      }),
    )
    mocks.calculateRfmBodyFatEstimate.mockReturnValue(
      null,
    )
  })

  test('updates resume step locally without calling the database in preview mode', async () => {
    mocks.getWeeklyCheckInNumber.mockReturnValue(
      null,
    )

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        mocks.loadWeeklyBodyFatProfile,
      ).toHaveBeenCalled()
    })

    let saved

    await act(async () => {
      saved = await result.current.saveDraft(
        WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
      )
    })

    expect(saved).toBe(true)
    expect(result.current.resumeStep).toBe(
      WEEKLY_CHECKIN_STEP_IDS.RECOVERY,
    )
    expect(
      mocks.saveWeeklyCheckInDraft,
    ).not.toHaveBeenCalled()
  })

  test('saves persisted draft form and resume step', async () => {
    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('weekly-1')
    })

    act(() => {
      result.current.setField(
        'weekly_reflection',
        'Draft reflection',
      )
    })

    let saved

    await act(async () => {
      saved = await result.current.saveDraft(
        WEEKLY_CHECKIN_STEP_IDS.REFLECTION,
      )
    })

    expect(saved).toBe(true)
    expect(
      mocks.saveWeeklyCheckInDraft,
    ).toHaveBeenCalledWith(
      'weekly-1',
      expect.objectContaining({
        form: expect.objectContaining({
          weekly_reflection:
            'Draft reflection',
        }),
        resumeStep:
          WEEKLY_CHECKIN_STEP_IDS.REFLECTION,
        photosRequired: false,
        bodyFatSource: 'none',
      }),
    )
    expect(result.current.saveMessage).toBe(
      'Saved',
    )
  })

  test('surfaces draft-save failures', async () => {
    mocks.saveWeeklyCheckInDraft.mockRejectedValue(
      new Error('Draft save failed'),
    )

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('weekly-1')
    })

    let saved

    await act(async () => {
      saved =
        await result.current.saveDraft(
          'next-step',
        )
    })

    expect(saved).toBe(false)
    expect(result.current.error).toBe(
      'Draft save failed',
    )
    expect(result.current.saving).toBe(
      false,
    )
  })
})

describe('useWeeklyCheckIn submission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-16',
    )
    mocks.getWeeklyCheckInNumber.mockReturnValue(
      2,
    )
    mocks.getPreviewWeeklyCheckInNumber.mockReturnValue(
      2,
    )
    mocks.isFullWeeklyMeasurementCheckIn.mockReturnValue(
      false,
    )
    mocks.loadWeeklyBodyFatProfile.mockResolvedValue(
      profile,
    )
    mocks.createWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
    })
    mocks.loadWeeklyCheckInPhotos.mockResolvedValue(
      [],
    )
    mocks.saveWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
    })
    mocks.saveTodayDailyCheckIn.mockResolvedValue({
      id: 'daily-1',
    })
    mocks.completeWeeklyCheckIn.mockResolvedValue({
      ...draft,
      status: 'completed',
    })
    mocks.calculateRfmBodyFatEstimate.mockReturnValue(
      null,
    )
  })

  test('submits in draft → Daily → Weekly order', async () => {
    const onSaved = vi.fn()

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
        settings: {
          track_water: true,
          track_alcohol: true,
        },
        onSaved,
      }),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('weekly-1')
    })

    setSubmissionFields(result)

    let submitted

    await act(async () => {
      submitted =
        await result.current.submitCheckIn()
    })

    expect(submitted).toBe(true)
    expect(
      mocks.saveWeeklyCheckInDraft,
    ).toHaveBeenCalled()
    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalled()
    expect(
      mocks.completeWeeklyCheckIn,
    ).toHaveBeenCalled()

    expect(
      mocks.saveWeeklyCheckInDraft.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      mocks.saveTodayDailyCheckIn.mock
        .invocationCallOrder[0],
    )
    expect(
      mocks.saveTodayDailyCheckIn.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      mocks.completeWeeklyCheckIn.mock
        .invocationCallOrder[0],
    )

    expect(onSaved).toHaveBeenCalledOnce()
    expect(result.current.saveMessage).toBe(
      'Submitted',
    )
  })

  test('builds the Daily record from Weekly answers', async () => {
    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
        settings: {
          track_water: true,
          track_alcohol: true,
        },
      }),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('weekly-1')
    })

    setSubmissionFields(result)

    await act(async () => {
      await result.current.submitCheckIn()
    })

    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        coaching_plan_id: 'plan-1',
        morning_weight: 150.5,
        weight_status: 'recorded',
        meal_plan_score: 4,
        meal_plan_deviation_details:
          'Extra snack.',
        planned_cheat_meal_status:
          'not_eaten',
        hunger_score: 3,
        water_goal_met: true,
        workout_status: 'completed',
        training_problem: false,
        cardio_minutes: 20,
        cardio_type: 'walking',
        cardio_intensity: 'moderate',
        alcohol_consumed: false,
        alcohol_details: null,
        additional_notes: null,
        questions_for_coach: null,
      }),
    )
  })

  test('omits water and alcohol answers from Weekly-created Daily record when tracking is off', async () => {
    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
        settings: {
          track_water: false,
          track_alcohol: false,
        },
      }),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('weekly-1')
    })

    setSubmissionFields(result)

    act(() => {
      result.current.setField(
        'alcohol_consumed',
        true,
      )
      result.current.setField(
        'alcohol_details',
        '2 drinks',
      )
    })

    await act(async () => {
      await result.current.submitCheckIn()
    })

    expect(
      mocks.saveTodayDailyCheckIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        water_goal_met: null,
        alcohol_consumed: null,
        alcohol_details: null,
      }),
    )
  })

  test('builds regular-week Weekly structured values with waist and recovery data', async () => {
    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('weekly-1')
    })

    setSubmissionFields(result)

    await act(async () => {
      await result.current.submitCheckIn()
    })

    expect(
      mocks.completeWeeklyCheckIn,
    ).toHaveBeenCalledWith(
      'weekly-1',
      expect.objectContaining({
        dailyCheckInId: 'daily-1',
        structuredValues:
          expect.objectContaining({
            photos_required: false,
            measurement_side: 'right',
            neck: null,
            chest: null,
            waist: 32,
            hips: null,
            right_arm: null,
            left_arm: null,
            body_fat_source: 'none',
            body_fat_percent: null,
            sleep_quality: 4,
            energy_level: 4,
            recovery_score: 3,
            stress_level: 2,
            weekly_reflection:
              'Strong week overall.',
            questions_for_coach:
              'Strong week overall.',
          }),
      }),
    )
  })

  test('saves full measurement-week values to the chosen side', async () => {
    mocks.isFullWeeklyMeasurementCheckIn.mockReturnValue(
      true,
    )
    mocks.createWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
      photos_required: true,
    })

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(result.current.photosRequired).toBe(
        true,
      )
    })

    setSubmissionFields(result)

    act(() => {
      result.current.setField(
        'neck_inches',
        '14',
      )
      result.current.setField(
        'chest_inches',
        '36',
      )
      result.current.setField(
        'hips_inches',
        '40',
      )
      result.current.setField(
        'bicep_inches',
        '12',
      )
      result.current.setField(
        'thigh_inches',
        '22',
      )
      result.current.setField(
        'calf_inches',
        '14',
      )
    })

    await act(async () => {
      await result.current.submitCheckIn()
    })

    expect(
      mocks.completeWeeklyCheckIn,
    ).toHaveBeenCalledWith(
      'weekly-1',
      expect.objectContaining({
        structuredValues:
          expect.objectContaining({
            photos_required: true,
            neck: 14,
            chest: 36,
            waist: 32,
            hips: 40,
            right_arm: 12,
            left_arm: null,
            right_thigh: 22,
            left_thigh: null,
            right_calf: 14,
            left_calf: null,
          }),
      }),
    )
  })

  test('saves scale body fat only when status is recorded', async () => {
    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'scale',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('weekly-1')
    })

    setSubmissionFields(result)

    act(() => {
      result.current.setField(
        'body_fat_status',
        'recorded',
      )
      result.current.setField(
        'scale_body_fat_percent',
        '30.2',
      )
    })

    await act(async () => {
      await result.current.submitCheckIn()
    })

    expect(
      mocks.completeWeeklyCheckIn,
    ).toHaveBeenCalledWith(
      'weekly-1',
      expect.objectContaining({
        structuredValues:
          expect.objectContaining({
            scale_body_fat: 30.2,
            body_fat_percent: 30.2,
            body_fat_source: 'scale',
            body_fat_method: null,
          }),
      }),
    )
  })

  test('saves the RFM estimate into Weekly structured values', async () => {
    mocks.calculateRfmBodyFatEstimate.mockReturnValue({
      percent: 29.8,
      formulaVersion: 'rfm_v1',
    })

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource:
          'juntos_estimate',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('weekly-1')
    })

    setSubmissionFields(result)

    await waitFor(() => {
      expect(
        result.current.estimatedBodyFat,
      ).toEqual({
        percent: 29.8,
        formulaVersion: 'rfm_v1',
      })
    })

    await act(async () => {
      await result.current.submitCheckIn()
    })

    expect(
      mocks.completeWeeklyCheckIn,
    ).toHaveBeenCalledWith(
      'weekly-1',
      expect.objectContaining({
        structuredValues:
          expect.objectContaining({
            body_fat_percent: 29.8,
            body_fat_source:
              'juntos_estimate',
            body_fat_method: 'rfm_v1',
            scale_body_fat: null,
          }),
      }),
    )
  })

  test('blocks submit in preview mode', async () => {
    mocks.getWeeklyCheckInNumber.mockReturnValue(
      null,
    )

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        result.current.persistenceEnabled,
      ).toBe(false)
    })

    let submitted

    await act(async () => {
      submitted =
        await result.current.submitCheckIn()
    })

    expect(submitted).toBe(false)
    expect(
      mocks.saveTodayDailyCheckIn,
    ).not.toHaveBeenCalled()
    expect(
      mocks.completeWeeklyCheckIn,
    ).not.toHaveBeenCalled()
  })

  test('surfaces submission failures and does not leave saving stuck', async () => {
    mocks.saveTodayDailyCheckIn.mockRejectedValue(
      new Error('Daily bridge failed'),
    )

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('weekly-1')
    })

    setSubmissionFields(result)

    let submitted

    await act(async () => {
      submitted =
        await result.current.submitCheckIn()
    })

    expect(submitted).toBe(false)
    expect(result.current.error).toBe(
      'Daily bridge failed',
    )
    expect(result.current.saving).toBe(
      false,
    )
    expect(
      mocks.completeWeeklyCheckIn,
    ).not.toHaveBeenCalled()
  })
})

describe('useWeeklyCheckIn photo behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-16',
    )
    mocks.getWeeklyCheckInNumber.mockReturnValue(
      2,
    )
    mocks.getPreviewWeeklyCheckInNumber.mockReturnValue(
      2,
    )
    mocks.isFullWeeklyMeasurementCheckIn.mockReturnValue(
      true,
    )
    mocks.loadWeeklyBodyFatProfile.mockResolvedValue(
      profile,
    )
    mocks.createWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
      photos_required: true,
    })
    mocks.loadWeeklyCheckInPhotos
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          id: 'side-1',
          pose: 'side',
          side_view: 'right',
        },
      ])
    mocks.uploadWeeklyCheckInPhoto.mockResolvedValue(
      undefined,
    )
    mocks.calculateRfmBodyFatEstimate.mockReturnValue(
      null,
    )
  })

  test('uploads persisted side photo with the plan measurement side', async () => {
    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(
        result.current.existingCheckIn?.id,
      ).toBe('weekly-1')
    })

    const file = new File(
      ['photo'],
      'side.jpg',
      {
        type: 'image/jpeg',
      },
    )

    let uploaded

    await act(async () => {
      uploaded =
        await result.current.uploadPhoto(
          'side',
          file,
        )
    })

    expect(uploaded).toBe(true)
    expect(
      mocks.uploadWeeklyCheckInPhoto,
    ).toHaveBeenCalledWith({
      coachingPlanId: 'plan-1',
      weeklyCheckInId: 'weekly-1',
      pose: 'side',
      sideView: 'right',
      file,
    })
    expect(
      result.current.photos.side?.side_view,
    ).toBe('right')
  })

  test('does not upload photos after Weekly completion', async () => {
    mocks.createWeeklyCheckInDraft.mockResolvedValue({
      ...draft,
      status: 'completed',
      photos_required: true,
    })

    const { result } = renderHook(() =>
      useWeeklyCheckIn(plan, {
        bodyFatSource: 'none',
        unitSystem: 'imperial',
      }),
    )

    await waitFor(() => {
      expect(result.current.isCompleted).toBe(
        true,
      )
    })

    let uploaded

    await act(async () => {
      uploaded =
        await result.current.uploadPhoto(
          'front',
          new File(
            ['photo'],
            'front.jpg',
            {
              type: 'image/jpeg',
            },
          ),
        )
    })

    expect(uploaded).toBe(false)
    expect(
      mocks.uploadWeeklyCheckInPhoto,
    ).not.toHaveBeenCalled()
  })
})
