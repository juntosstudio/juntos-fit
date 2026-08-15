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
  completeStartCheckIn: vi.fn(),
  createStartCheckInDraft: vi.fn(),
  loadBodyFatProfile: vi.fn(),
  savePlanMeasurementPreferences: vi.fn(),
  saveStartCheckInMeasurements: vi.fn(),
  loadStartCheckInPhotos: vi.fn(),
  uploadStartCheckInPhoto: vi.fn(),
  calculateJuntosBodyFatEstimate: vi.fn(),
  getBrowserTimeZone: vi.fn(
    () => 'America/Chicago',
  ),
  getDateKeyForTimeZone: vi.fn(
    () => '2026-08-15',
  ),
}))

vi.mock(
  '../services/startCheckInService',
  () => ({
    completeStartCheckIn:
      mocks.completeStartCheckIn,
    createStartCheckInDraft:
      mocks.createStartCheckInDraft,
    loadBodyFatProfile:
      mocks.loadBodyFatProfile,
    savePlanMeasurementPreferences:
      mocks.savePlanMeasurementPreferences,
    saveStartCheckInMeasurements:
      mocks.saveStartCheckInMeasurements,
  }),
)

vi.mock(
  '../services/startCheckInPhotoService',
  () => ({
    loadStartCheckInPhotos:
      mocks.loadStartCheckInPhotos,
    uploadStartCheckInPhoto:
      mocks.uploadStartCheckInPhoto,
  }),
)

vi.mock('../utils/bodyFat', () => ({
  calculateJuntosBodyFatEstimate:
    mocks.calculateJuntosBodyFatEstimate,
}))

vi.mock('../utils/timeZone', () => ({
  getBrowserTimeZone:
    mocks.getBrowserTimeZone,
  getDateKeyForTimeZone:
    mocks.getDateKeyForTimeZone,
}))

import {
  useStartCheckIn,
} from './useStartCheckIn'

const basePlan = {
  id: 'plan-1',
  user_id: 'user-1',
  start_date: '2026-08-15',
  body_fat_source: 'none',
  measurement_side: 'right',
  time_zone: 'America/Chicago',
}

const baseProfile = {
  unit_system: 'imperial',
  height_cm: 170,
  date_of_birth: '1985-01-01',
  sex: 'female',
  time_zone: 'America/Chicago',
}

const draftCheckIn = {
  id: 'start-1',
  status: 'draft',
  starting_weight_lbs: null,
  body_fat_percent: null,
  body_fat_status: null,
  neck_inches: null,
  chest_inches: null,
  waist_inches: null,
  hips_inches: null,
  upper_arm_inches: null,
  thigh_inches: null,
  calf_inches: null,
}

const completePhotos = [
  {
    id: 'front-1',
    pose: 'front',
  },
  {
    id: 'side-1',
    pose: 'side',
    side_view: 'right',
  },
  {
    id: 'back-1',
    pose: 'back',
  },
]

function fillRequiredMeasurements(result) {
  act(() => {
    result.current.setField(
      'starting_weight_lbs',
      '150',
    )
    result.current.setField(
      'neck_inches',
      '14',
    )
    result.current.setField(
      'chest_inches',
      '36',
    )
    result.current.setField(
      'waist_inches',
      '32',
    )
    result.current.setField(
      'hips_inches',
      '40',
    )
    result.current.setField(
      'measurement_side',
      'right',
    )
    result.current.setField(
      'upper_arm_inches',
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
}

describe('useStartCheckIn availability and loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDateKeyForTimeZone.mockReturnValue(
      '2026-08-15',
    )
    mocks.createStartCheckInDraft.mockResolvedValue({
      ...draftCheckIn,
    })
    mocks.loadBodyFatProfile.mockResolvedValue({
      ...baseProfile,
    })
    mocks.loadStartCheckInPhotos.mockResolvedValue(
      [],
    )
    mocks.savePlanMeasurementPreferences.mockResolvedValue(
      undefined,
    )
    mocks.saveStartCheckInMeasurements.mockImplementation(
      async (_id, values) => ({
        ...draftCheckIn,
        ...values,
      }),
    )
    mocks.completeStartCheckIn.mockResolvedValue({
      ...draftCheckIn,
      status: 'completed',
    })
    mocks.uploadStartCheckInPhoto.mockResolvedValue(
      undefined,
    )
    mocks.calculateJuntosBodyFatEstimate.mockReturnValue(
      null,
    )
  })

  test('is unavailable before plan Start Day and does not create a draft', async () => {
    mocks.getDateKeyForTimeZone.mockReturnValue(
      '2026-08-14',
    )

    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    expect(
      result.current.planHasStarted,
    ).toBe(false)
    expect(result.current.canEdit).toBe(
      false,
    )

    await waitFor(() => {
      expect(
        mocks.createStartCheckInDraft,
      ).not.toHaveBeenCalled()
    })
  })

  test('loads the Start Check-In on Start Day', async () => {
    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    await waitFor(() => {
      expect(
        mocks.createStartCheckInDraft,
      ).toHaveBeenCalledWith(
        'plan-1',
        '2026-08-15',
      )
    })

    await waitFor(() => {
      expect(
        result.current.form.measurement_side,
      ).toBe('right')
    })

    expect(
      mocks.loadBodyFatProfile,
    ).toHaveBeenCalledWith('user-1')
    expect(
      result.current.planHasStarted,
    ).toBe(true)
    expect(result.current.canEdit).toBe(
      true,
    )
    expect(result.current.isReadOnly).toBe(
      false,
    )
  })

  test('maps saved canonical measurements and photos into the form', async () => {
    mocks.createStartCheckInDraft.mockResolvedValue({
      ...draftCheckIn,
      starting_weight_lbs: 150,
      neck_inches: 14,
      chest_inches: 36,
      waist_inches: 32,
      hips_inches: 40,
      upper_arm_inches: 12,
      thigh_inches: 22,
      calf_inches: 14,
      body_fat_percent: 30,
      body_fat_status: 'recorded',
    })
    mocks.loadStartCheckInPhotos.mockResolvedValue(
      completePhotos,
    )

    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    await waitFor(() => {
      expect(
        result.current.form.starting_weight_lbs,
      ).toBe('150.0')
    })

    expect(
      result.current.form.starting_weight_status,
    ).toBe('recorded')
    expect(
      result.current.form.waist_inches,
    ).toBe('32.0')
    expect(
      result.current.form.body_fat_percent,
    ).toBe('30.0')
    expect(
      result.current.photos.front?.id,
    ).toBe('front-1')
    expect(result.current.hasAllPhotos).toBe(
      true,
    )
    expect(result.current.isDirty).toBe(
      false,
    )
  })

  test('locks a completed Start Check-In after Start Day passes', async () => {
    mocks.getDateKeyForTimeZone.mockReturnValue(
      '2026-08-16',
    )
    mocks.createStartCheckInDraft.mockResolvedValue({
      ...draftCheckIn,
      status: 'completed',
    })

    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    await waitFor(() => {
      expect(
        result.current.isCompleted,
      ).toBe(true)
    })

    expect(result.current.canEdit).toBe(
      false,
    )
    expect(result.current.isReadOnly).toBe(
      true,
    )
  })
})

describe('useStartCheckIn field behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDateKeyForTimeZone.mockReturnValue(
      '2026-08-15',
    )
    mocks.createStartCheckInDraft.mockResolvedValue({
      ...draftCheckIn,
    })
    mocks.loadBodyFatProfile.mockResolvedValue({
      ...baseProfile,
    })
    mocks.loadStartCheckInPhotos.mockResolvedValue(
      [],
    )
    mocks.savePlanMeasurementPreferences.mockResolvedValue(
      undefined,
    )
    mocks.saveStartCheckInMeasurements.mockImplementation(
      async (_id, values) => ({
        ...draftCheckIn,
        ...values,
      }),
    )
    mocks.completeStartCheckIn.mockResolvedValue({
      ...draftCheckIn,
      status: 'completed',
    })
    mocks.uploadStartCheckInPhoto.mockResolvedValue(
      undefined,
    )
    mocks.calculateJuntosBodyFatEstimate.mockReturnValue(
      null,
    )
  })

  test('entering starting weight automatically marks weight as recorded', async () => {
    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    act(() => {
      result.current.setField(
        'starting_weight_lbs',
        '150',
      )
    })

    expect(
      result.current.form.starting_weight_status,
    ).toBe('recorded')
  })

  test('choosing a non-recorded weight status clears the weight', async () => {
    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    act(() => {
      result.current.setField(
        'starting_weight_lbs',
        '150',
      )
      result.current.setField(
        'starting_weight_status',
        'not_recorded',
      )
    })

    expect(
      result.current.form.starting_weight_lbs,
    ).toBe('')
  })

  test('marking scale body fat unavailable clears its value', async () => {
    const plan = {
      ...basePlan,
      body_fat_source: 'scale',
    }

    const { result } = renderHook(() =>
      useStartCheckIn(plan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    act(() => {
      result.current.setField(
        'body_fat_percent',
        '30',
      )
      result.current.setField(
        'body_fat_unavailable',
        true,
      )
    })

    expect(
      result.current.form.body_fat_percent,
    ).toBe('')
    expect(
      result.current.form.body_fat_unavailable,
    ).toBe(true)
  })

  test('entering a scale body-fat value clears unavailable state', async () => {
    const plan = {
      ...basePlan,
      body_fat_source: 'scale',
    }

    const { result } = renderHook(() =>
      useStartCheckIn(plan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    act(() => {
      result.current.setField(
        'body_fat_unavailable',
        true,
      )
      result.current.setField(
        'body_fat_percent',
        '30',
      )
    })

    expect(
      result.current.form.body_fat_unavailable,
    ).toBe(false)
    expect(
      result.current.form.body_fat_percent,
    ).toBe('30')
  })
})

describe('useStartCheckIn save behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDateKeyForTimeZone.mockReturnValue(
      '2026-08-15',
    )
    mocks.createStartCheckInDraft.mockResolvedValue({
      ...draftCheckIn,
    })
    mocks.loadBodyFatProfile.mockResolvedValue({
      ...baseProfile,
    })
    mocks.loadStartCheckInPhotos.mockResolvedValue(
      completePhotos,
    )
    mocks.savePlanMeasurementPreferences.mockResolvedValue(
      undefined,
    )
    mocks.saveStartCheckInMeasurements.mockImplementation(
      async (_id, values) => ({
        ...draftCheckIn,
        ...values,
      }),
    )
    mocks.completeStartCheckIn.mockResolvedValue({
      ...draftCheckIn,
      status: 'completed',
      starting_weight_lbs: 150,
      neck_inches: 14,
      chest_inches: 36,
      waist_inches: 32,
      hips_inches: 40,
      upper_arm_inches: 12,
      thigh_inches: 22,
      calf_inches: 14,
    })
    mocks.uploadStartCheckInPhoto.mockResolvedValue(
      undefined,
    )
    mocks.calculateJuntosBodyFatEstimate.mockReturnValue({
      percent: 31.2,
      formulaVersion: 'test_formula',
    })
  })

  test('saves canonical measurements and not-tracked body-fat values', async () => {
    const onSaved = vi.fn()

    const { result } = renderHook(() =>
      useStartCheckIn(
        basePlan,
        onSaved,
      ),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    fillRequiredMeasurements(result)

    let saved

    await act(async () => {
      saved =
        await result.current.saveCheckIn()
    })

    expect(saved).toBe(true)
    expect(
      mocks.savePlanMeasurementPreferences,
    ).toHaveBeenCalledWith(
      'plan-1',
      {
        measurementSide: 'right',
        timeZone: 'America/Chicago',
      },
    )
    expect(
      mocks.saveStartCheckInMeasurements,
    ).toHaveBeenCalledWith(
      'start-1',
      expect.objectContaining({
        starting_weight_lbs: 150,
        neck_inches: 14,
        chest_inches: 36,
        waist_inches: 32,
        hips_inches: 40,
        upper_arm_inches: 12,
        thigh_inches: 22,
        calf_inches: 14,
        body_fat_percent: null,
        body_fat_status:
          'not_tracked',
        body_fat_method: null,
        body_fat_formula_version: null,
      }),
    )
    expect(onSaved).toHaveBeenCalledOnce()
    expect(
      result.current.successMessage,
    ).toBe(
      'Your Start Check-In was saved.',
    )
  })

  test('saves a recorded scale body-fat value', async () => {
    const plan = {
      ...basePlan,
      body_fat_source: 'scale',
    }

    const { result } = renderHook(() =>
      useStartCheckIn(plan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    fillRequiredMeasurements(result)

    act(() => {
      result.current.setField(
        'body_fat_percent',
        '30.5',
      )
    })

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(
      mocks.saveStartCheckInMeasurements,
    ).toHaveBeenCalledWith(
      'start-1',
      expect.objectContaining({
        body_fat_percent: '30.5',
        body_fat_status: 'recorded',
        body_fat_method: 'scale',
        body_fat_formula_version: null,
      }),
    )
  })

  test('saves scale body fat as unavailable when user has no reading', async () => {
    const plan = {
      ...basePlan,
      body_fat_source: 'scale',
    }

    const { result } = renderHook(() =>
      useStartCheckIn(plan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    fillRequiredMeasurements(result)

    act(() => {
      result.current.setField(
        'body_fat_unavailable',
        true,
      )
    })

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(
      mocks.saveStartCheckInMeasurements,
    ).toHaveBeenCalledWith(
      'start-1',
      expect.objectContaining({
        body_fat_percent: null,
        body_fat_status: 'unavailable',
        body_fat_method: null,
        body_fat_formula_version: null,
      }),
    )
  })

  test('uses the estimator result for Juntos-estimate body fat without asserting a specific formula implementation', async () => {
    const plan = {
      ...basePlan,
      body_fat_source:
        'juntos_estimate',
    }

    const { result } = renderHook(() =>
      useStartCheckIn(plan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    fillRequiredMeasurements(result)

    await waitFor(() => {
      expect(
        result.current.estimatedBodyFat,
      ).toEqual({
        percent: 31.2,
        formulaVersion: 'test_formula',
      })
    })

    await act(async () => {
      await result.current.saveCheckIn()
    })

    expect(
      mocks.saveStartCheckInMeasurements,
    ).toHaveBeenCalledWith(
      'start-1',
      expect.objectContaining({
        body_fat_percent: 31.2,
        body_fat_status: 'estimated',
        body_fat_method:
          'juntos_estimate',
        body_fat_formula_version:
          'test_formula',
      }),
    )
  })

  test('completes the Start Check-In only after saving measurements', async () => {
    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    fillRequiredMeasurements(result)

    let saved

    await act(async () => {
      saved =
        await result.current.saveCheckIn({
          complete: true,
        })
    })

    expect(saved).toBe(true)
    expect(
      mocks.saveStartCheckInMeasurements,
    ).toHaveBeenCalled()
    expect(
      mocks.completeStartCheckIn,
    ).toHaveBeenCalledWith('start-1')
    expect(
      mocks.saveStartCheckInMeasurements.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      mocks.completeStartCheckIn.mock
        .invocationCallOrder[0],
    )
    expect(
      result.current.successMessage,
    ).toBe(
      'Your Start Check-In is complete.',
    )
  })

  test('blocks completion when required measurements are missing', async () => {
    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    act(() => {
      result.current.setField(
        'starting_weight_status',
        'not_recorded',
      )
    })

    let saved

    await act(async () => {
      saved =
        await result.current.saveCheckIn({
          complete: true,
        })
    })

    expect(saved).toBe(false)
    expect(result.current.error).toBe(
      'Enter your neck measurement.',
    )
    expect(
      mocks.saveStartCheckInMeasurements,
    ).not.toHaveBeenCalled()
  })

  test('blocks completion when the side photo does not match the chosen measurement side', async () => {
    mocks.loadStartCheckInPhotos.mockResolvedValue([
      {
        id: 'front-1',
        pose: 'front',
      },
      {
        id: 'side-1',
        pose: 'side',
        side_view: 'left',
      },
      {
        id: 'back-1',
        pose: 'back',
      },
    ])

    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    fillRequiredMeasurements(result)

    let saved

    await act(async () => {
      saved =
        await result.current.saveCheckIn({
          complete: true,
        })
    })

    expect(saved).toBe(false)
    expect(result.current.error).toBe(
      'Add a right side progress photo.',
    )
  })

  test('surfaces save-service failures', async () => {
    mocks.saveStartCheckInMeasurements.mockRejectedValue(
      new Error('Start save failed'),
    )

    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    fillRequiredMeasurements(result)

    let saved

    await act(async () => {
      saved =
        await result.current.saveCheckIn()
    })

    expect(saved).toBe(false)
    expect(result.current.error).toBe(
      'Start save failed',
    )
    expect(result.current.saving).toBe(
      false,
    )
  })
})

describe('useStartCheckIn photo upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDateKeyForTimeZone.mockReturnValue(
      '2026-08-15',
    )
    mocks.createStartCheckInDraft.mockResolvedValue({
      ...draftCheckIn,
    })
    mocks.loadBodyFatProfile.mockResolvedValue({
      ...baseProfile,
    })
    mocks.loadStartCheckInPhotos
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          id: 'side-1',
          pose: 'side',
          side_view: 'right',
        },
      ])
    mocks.savePlanMeasurementPreferences.mockResolvedValue(
      undefined,
    )
    mocks.uploadStartCheckInPhoto.mockResolvedValue(
      undefined,
    )
    mocks.saveStartCheckInMeasurements.mockImplementation(
      async (_id, values) => ({
        ...draftCheckIn,
        ...values,
      }),
    )
    mocks.completeStartCheckIn.mockResolvedValue({
      ...draftCheckIn,
      status: 'completed',
    })
    mocks.calculateJuntosBodyFatEstimate.mockReturnValue(
      null,
    )
  })

  test('requires a measurement side before uploading the side photo', async () => {
    const plan = {
      ...basePlan,
      measurement_side: '',
    }

    const { result } = renderHook(() =>
      useStartCheckIn(plan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    let uploaded

    await act(async () => {
      uploaded =
        await result.current.uploadPhoto(
          'side',
          new File(
            ['photo'],
            'side.jpg',
            { type: 'image/jpeg' },
          ),
        )
    })

    expect(uploaded).toBe(false)
    expect(result.current.error).toBe(
      'Choose your measurement side before adding the side photo.',
    )
    expect(
      mocks.uploadStartCheckInPhoto,
    ).not.toHaveBeenCalled()
  })

  test('saves side preference and uploads the side photo with side_view', async () => {
    const { result } = renderHook(() =>
      useStartCheckIn(basePlan),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(
        false,
      )
    })

    const file = new File(
      ['photo'],
      'side.jpg',
      { type: 'image/jpeg' },
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
      mocks.savePlanMeasurementPreferences,
    ).toHaveBeenCalledWith(
      'plan-1',
      {
        measurementSide: 'right',
        timeZone: 'America/Chicago',
      },
    )
    expect(
      mocks.uploadStartCheckInPhoto,
    ).toHaveBeenCalledWith({
      coachingPlanId: 'plan-1',
      startCheckInId: 'start-1',
      pose: 'side',
      sideView: 'right',
      file,
    })
    expect(
      result.current.photos.side?.side_view,
    ).toBe('right')
  })
})
