import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  getTodayDateKey,
} from '../utils/dates'
import {
  getPreviewWeeklyCheckInNumber,
  getWeeklyCheckInNumber,
  isFullWeeklyMeasurementCheckIn,
  WEEKLY_CHECKIN_STEP_IDS,
} from '../utils/weeklyCheckInFlow'
import {
  calculateRfmBodyFatEstimate,
} from '../utils/bodyFat'
import {
  toCanonicalMeasurement,
} from '../utils/measurementUnits'
import {
  loadWeeklyBodyFatProfile,
} from '../services/weeklyCheckInPreviewService'
import {
  completeWeeklyCheckIn,
  createWeeklyCheckInDraft,
  saveWeeklyCheckInDraft,
} from '../services/weeklyCheckInService'
import {
  loadWeeklyCheckInPhotos,
  uploadWeeklyCheckInPhoto,
} from '../services/weeklyCheckInPhotoService'
import {
  loadLastCardioContext,
  saveDailyCheckInForDate,
} from '../services/dailyCheckInService'
import {
  getErrorMessage,
  logDevelopmentError,
} from '../utils/errors'

const EMPTY_FORM = {
  morning_weight: '',
  weight_status: '',
  meal_plan_score: '',
  meal_plan_deviation_type: '',
  meal_plan_deviation_details: '',
  planned_cheat_meal_status: '',
  hunger_score: '',
  workout_status: '',
  workout_incomplete_reason: '',
  training_problem: null,
  training_problem_details: '',
  cardio_minutes: '0',
  cardio_type: '',
  cardio_intensity: '',
  water_goal_met: null,
  alcohol_consumed: null,
  alcohol_details: '',

  sleep_quality: '',
  energy_level: '',
  recovery_score: '',
  stress_level: '',

  measurement_side: '',
  neck_inches: '',
  chest_inches: '',
  waist_inches: '',
  hips_inches: '',
  bicep_inches: '',
  thigh_inches: '',
  calf_inches: '',

  body_fat_status: '',
  scale_body_fat_percent: '',
  menstrual_cycle_context: '',
  weekly_reflection: '',

  // Kept for compatibility with older preview data.
  coach_notes: '',
  additional_notes: '',
  questions_for_coach: '',
}

const EMPTY_PHOTOS = {
  front: null,
  side: null,
  back: null,
}

function getSavedMeasurementSide(plan) {
  return (
    plan?.measurement_side ??
    plan?.side_choice ??
    ''
  )
}

function getBodyFatStatus(bodyFatSource) {
  if (
    bodyFatSource ===
    'juntos_estimate'
  ) {
    return 'estimated'
  }

  if (bodyFatSource === 'none') {
    return 'not_tracked'
  }

  return ''
}

function mapPhotosByPose(photos) {
  const result = {
    ...EMPTY_PHOTOS,
  }

  for (const photo of photos ?? []) {
    result[photo.pose] = photo
  }

  return result
}

function buildInitialForm(
  plan,
  bodyFatSource,
  draftData,
) {
  return {
    ...EMPTY_FORM,
    measurement_side:
      getSavedMeasurementSide(plan),
    body_fat_status:
      getBodyFatStatus(
        bodyFatSource,
      ),
    ...(draftData &&
    typeof draftData === 'object'
      ? draftData
      : {}),
  }
}

function optionalText(value) {
  const trimmed = String(
    value ?? '',
  ).trim()

  return trimmed || null
}

function nullableNumber(value) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : null
}

function canonicalMeasurement(
  field,
  value,
  unitSystem,
) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null
  }

  return toCanonicalMeasurement(
    field,
    value,
    unitSystem,
  )
}

function buildDailyValues({
  plan,
  form,
  settings,
}) {
  return {
    coaching_plan_id: plan.id,
    morning_weight:
      form.weight_status === 'recorded'
        ? nullableNumber(
            form.morning_weight,
          )
        : null,
    weight_status:
      form.weight_status,
    meal_plan_score:
      nullableNumber(
        form.meal_plan_score,
      ),
    meal_plan_deviation_details:
      optionalText(
        form.meal_plan_deviation_details,
      ),
    planned_cheat_meal_status:
      optionalText(
        form.planned_cheat_meal_status,
      ),
    hunger_score:
      nullableNumber(
        form.hunger_score,
      ),
    water_goal_met:
      settings?.track_water === false
        ? null
        : form.water_goal_met,
    workout_status:
      optionalText(
        form.workout_status,
      ),
    workout_incomplete_reason:
      optionalText(
        form.workout_incomplete_reason,
      ),
    training_problem:
      form.training_problem,
    training_problem_details:
      optionalText(
        form.training_problem_details,
      ),
    cardio_minutes:
      nullableNumber(
        form.cardio_minutes,
      ) ?? 0,
    cardio_type:
      Number(form.cardio_minutes) > 0
        ? optionalText(
            form.cardio_type,
          )
        : null,
    cardio_intensity:
      Number(form.cardio_minutes) > 0
        ? optionalText(
            form.cardio_intensity,
          )
        : null,
    alcohol_consumed:
      settings?.track_alcohol === false
        ? null
        : form.alcohol_consumed,
    alcohol_details:
      settings?.track_alcohol === false
        ? null
        : optionalText(
            form.alcohol_details,
          ),
    additional_notes: null,
    questions_for_coach: null,
  }
}

function buildWeeklyValues({
  form,
  plan,
  unitSystem,
  bodyFatSource,
  estimatedBodyFat,
  photosRequired,
}) {
  let bodyFatPercent = null
  let bodyFatMethod = null
  let scaleBodyFat = null

  if (
    bodyFatSource === 'scale' &&
    form.body_fat_status ===
      'recorded'
  ) {
    bodyFatPercent =
      nullableNumber(
        form.scale_body_fat_percent,
      )
    scaleBodyFat = bodyFatPercent
  }

  if (
    bodyFatSource ===
      'juntos_estimate' &&
    estimatedBodyFat
  ) {
    bodyFatPercent =
      estimatedBodyFat.percent
    bodyFatMethod =
      estimatedBodyFat.formulaVersion
  }

  const side =
    getSavedMeasurementSide(plan)
  const sideArm = photosRequired
    ? canonicalMeasurement(
        'upper_arm_inches',
        form.bicep_inches,
        unitSystem,
      )
    : null
  const sideThigh = photosRequired
    ? canonicalMeasurement(
        'thigh_inches',
        form.thigh_inches,
        unitSystem,
      )
    : null
  const sideCalf = photosRequired
    ? canonicalMeasurement(
        'calf_inches',
        form.calf_inches,
        unitSystem,
      )
    : null

  return {
    photos_required:
      Boolean(photosRequired),
    measurement_side:
      side || null,
    neck: photosRequired
      ? canonicalMeasurement(
          'neck_inches',
          form.neck_inches,
          unitSystem,
        )
      : null,
    chest: photosRequired
      ? canonicalMeasurement(
          'chest_inches',
          form.chest_inches,
          unitSystem,
        )
      : null,
    waist:
      canonicalMeasurement(
        'waist_inches',
        form.waist_inches,
        unitSystem,
      ),
    hips: photosRequired
      ? canonicalMeasurement(
          'hips_inches',
          form.hips_inches,
          unitSystem,
        )
      : null,
    right_arm:
      side === 'right'
        ? sideArm
        : null,
    left_arm:
      side === 'left'
        ? sideArm
        : null,
    right_thigh:
      side === 'right'
        ? sideThigh
        : null,
    left_thigh:
      side === 'left'
        ? sideThigh
        : null,
    right_calf:
      side === 'right'
        ? sideCalf
        : null,
    left_calf:
      side === 'left'
        ? sideCalf
        : null,
    scale_body_fat:
      scaleBodyFat,
    body_fat_percent:
      bodyFatPercent,
    body_fat_source:
      bodyFatSource || 'none',
    body_fat_method:
      bodyFatMethod,
    sleep_quality:
      nullableNumber(
        form.sleep_quality,
      ),
    energy_level:
      nullableNumber(
        form.energy_level,
      ),
    recovery_score:
      nullableNumber(
        form.recovery_score,
      ),
    stress_level:
      nullableNumber(
        form.stress_level,
      ),
    menstrual_cycle_context:
      optionalText(
        form.menstrual_cycle_context,
      ),
    weekly_reflection:
      optionalText(
        form.weekly_reflection,
      ),
    questions_for_coach:
      optionalText(
        form.weekly_reflection,
      ),
  }
}

export function useWeeklyCheckIn(
  plan,
  {
    bodyFatSource,
    unitSystem,
    settings,
    onSaved,
    checkinDate = null,
  } = {},
) {
  const currentDate = getTodayDateKey()
  const activeCheckInDate =
    checkinDate ?? currentDate

  const planLength = Number(
    plan?.program_length_weeks,
  )

  const rawExactWeekNumber =
    getWeeklyCheckInNumber(
      plan?.start_date,
      plan?.checkin_day,
      activeCheckInDate,
    )

  const exactWeekNumber =
    rawExactWeekNumber &&
    Number.isInteger(planLength) &&
    planLength > 0 &&
    rawExactWeekNumber > planLength
      ? null
      : rawExactWeekNumber

  const previewWeekNumber =
    getPreviewWeeklyCheckInNumber(
      plan?.start_date,
      plan?.checkin_day,
      activeCheckInDate,
    )

  const calculatedWeekNumber =
    Number.isInteger(planLength) &&
    planLength > 0 &&
    previewWeekNumber
      ? Math.min(
          previewWeekNumber,
          planLength,
        )
      : previewWeekNumber ?? 1

  const persistenceEnabled =
    Boolean(
      plan?.id &&
      plan?.user_id &&
      exactWeekNumber,
    )

  const cadencePhotosRequired =
    isFullWeeklyMeasurementCheckIn({
      weekNumber:
        exactWeekNumber ??
        calculatedWeekNumber,
      programLengthWeeks:
        plan?.program_length_weeks,
      photoFrequencyWeeks:
        plan?.photo_frequency_weeks ?? 4,
    })

  const [form, setForm] = useState(
    () =>
      buildInitialForm(
        plan,
        bodyFatSource,
        null,
      ),
  )
  const [photos, setPhotos] =
    useState({
      ...EMPTY_PHOTOS,
    })
  const [existingCheckIn, setExistingCheckIn] =
    useState(null)
  const [bodyFatProfile, setBodyFatProfile] =
    useState(null)
  const [resumeStep, setResumeStep] =
    useState(
      WEEKLY_CHECKIN_STEP_IDS
        .GET_STARTED,
    )
  const [loading, setLoading] =
    useState(false)
  const [saving, setSaving] =
    useState(false)
  const [uploadingPose, setUploadingPose] =
    useState('')
  const [error, setError] =
    useState('')
  const [saveMessage, setSaveMessage] =
    useState('')

  const localPhotoUrls =
    useRef(new Set())

  const weekNumber =
    existingCheckIn?.week_number ??
    exactWeekNumber ??
    calculatedWeekNumber

  const photosRequired =
    existingCheckIn?.photos_required ??
    cadencePhotosRequired

  const isFinalWeekly =
    Number(weekNumber) === planLength

  const estimatedBodyFat =
    useMemo(() => {
      if (
        bodyFatSource !==
        'juntos_estimate'
      ) {
        return null
      }

      const canonicalWaist =
        canonicalMeasurement(
          'waist_inches',
          form.waist_inches,
          unitSystem,
        )

      return calculateRfmBodyFatEstimate({
        waistInches:
          canonicalWaist,
        heightCm:
          bodyFatProfile?.height_cm,
        sex: bodyFatProfile?.sex,
      })
    }, [
      bodyFatSource,
      bodyFatProfile,
      form.waist_inches,
      unitSystem,
    ])

  const isCompleted =
    existingCheckIn?.status ===
    'completed'

  const reviewBodyFatSource =
    isCompleted
      ? existingCheckIn?.body_fat_source ??
        'none'
      : bodyFatSource

  const reviewEstimatedBodyFat =
    isCompleted &&
    reviewBodyFatSource ===
      'juntos_estimate' &&
    Number.isFinite(
      Number(
        existingCheckIn?.body_fat_percent,
      ),
    )
      ? {
          percent: Number(
            existingCheckIn.body_fat_percent,
          ),
          formulaVersion:
            existingCheckIn.body_fat_method ??
            'rfm_v1',
        }
      : estimatedBodyFat

  const loadCheckIn =
    useCallback(async () => {
      if (!plan?.id) {
        return
      }

      setLoading(true)
      setError('')

      try {
        const loadedProfile =
          await loadWeeklyBodyFatProfile(
            plan.user_id,
          )

        setBodyFatProfile(
          loadedProfile,
        )

        if (!persistenceEnabled) {
          setForm(
            buildInitialForm(
              plan,
              bodyFatSource,
              null,
            ),
          )
          setExistingCheckIn(null)
          setPhotos({
            ...EMPTY_PHOTOS,
          })
          setResumeStep(
            WEEKLY_CHECKIN_STEP_IDS
              .GET_STARTED,
          )
          return
        }

        const checkIn =
          await createWeeklyCheckInDraft({
            userId: plan.user_id,
            coachingPlanId: plan.id,
            checkinDate: activeCheckInDate,
            weekNumber:
              exactWeekNumber,
            photosRequired:
              cadencePhotosRequired,
            bodyFatSource,
          })

        const loadedPhotos =
          await loadWeeklyCheckInPhotos(
            checkIn.id,
          )

        const hasSavedCardioType =
          Object.prototype.hasOwnProperty.call(
            checkIn.draft_data ?? {},
            'cardio_type',
          )

        const lastCardioContext =
          checkIn.status !== 'completed' &&
          !hasSavedCardioType
            ? await loadLastCardioContext(
                plan.id,
                activeCheckInDate,
              )
            : null

        const draftDataWithCardioDefaults =
          checkIn.status === 'completed'
            ? checkIn.draft_data
            : {
                cardio_type:
                  lastCardioContext
                    ?.cardio_type ?? '',
                cardio_intensity:
                  lastCardioContext
                    ?.cardio_intensity ?? '',
                ...(checkIn.draft_data ??
                  {}),
              }

        setExistingCheckIn(checkIn)
        setForm(
          buildInitialForm(
            plan,
            checkIn.status ===
              'completed'
              ? checkIn.body_fat_source
              : bodyFatSource,
            draftDataWithCardioDefaults,
          ),
        )
        setPhotos(
          mapPhotosByPose(
            loadedPhotos,
          ),
        )
        setResumeStep(
          checkIn.status ===
            'completed'
            ? 'review'
            : checkIn.resume_step ||
                WEEKLY_CHECKIN_STEP_IDS
                  .GET_STARTED,
        )
      } catch (loadError) {
        logDevelopmentError(
          'useWeeklyCheckIn.loadCheckIn',
          loadError,
        )
        setError(
          getErrorMessage(
            loadError,
            'Your Weekly Check-In could not be loaded.',
          ),
        )
      } finally {
        setLoading(false)
      }
    }, [
      plan?.id,
      plan?.user_id,
      plan?.measurement_side,
      activeCheckInDate,
      exactWeekNumber,
      persistenceEnabled,
      cadencePhotosRequired,
      bodyFatSource,
    ])

  useEffect(() => {
    loadCheckIn()
  }, [loadCheckIn])

  useEffect(() => {
    if (isCompleted) {
      return
    }

    setForm((current) => {
      if (
        bodyFatSource === 'scale'
      ) {
        return {
          ...current,
          body_fat_status:
            [
              'recorded',
              'no_reading',
            ].includes(
              current.body_fat_status,
            )
              ? current.body_fat_status
              : '',
        }
      }

      return {
        ...current,
        body_fat_status:
          getBodyFatStatus(
            bodyFatSource,
          ),
        scale_body_fat_percent: '',
      }
    })
  }, [bodyFatSource, isCompleted])

  useEffect(
    () => () => {
      for (
        const url of
        localPhotoUrls.current
      ) {
        URL.revokeObjectURL(url)
      }
    },
    [],
  )

  function clearMessages() {
    setError('')
    setSaveMessage('')
  }

  function setField(field, value) {
    if (isCompleted) {
      return
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }))
    clearMessages()
  }

  async function saveDraft(
    nextResumeStep,
    formToSave = form,
  ) {
    if (!persistenceEnabled) {
      setResumeStep(
        nextResumeStep ||
          resumeStep,
      )
      return true
    }

    if (
      !existingCheckIn?.id ||
      isCompleted
    ) {
      return false
    }

    setSaving(true)
    setError('')
    setSaveMessage('Saving...')

    try {
      const saved =
        await saveWeeklyCheckInDraft(
          existingCheckIn.id,
          {
            form: formToSave,
            resumeStep:
              nextResumeStep,
            photosRequired,
            bodyFatSource,
          },
        )

      setExistingCheckIn(saved)
      setResumeStep(
        nextResumeStep ||
          resumeStep,
      )
      setSaveMessage('Saved')

      return true
    } catch (saveError) {
      logDevelopmentError(
        'useWeeklyCheckIn.saveDraft',
        saveError,
      )
      setSaveMessage('')
      setError(
        getErrorMessage(
          saveError,
          'Your Weekly Check-In draft could not be saved.',
        ),
      )

      return false
    } finally {
      setSaving(false)
    }
  }

  async function uploadPhoto(
    pose,
    file,
  ) {
    if (!file || isCompleted) {
      return false
    }

    clearMessages()

    if (!persistenceEnabled) {
      const previewUrl =
        URL.createObjectURL(file)
      localPhotoUrls.current.add(
        previewUrl,
      )

      setPhotos((current) => ({
        ...current,
        [pose]: {
          name: file.name,
          preview_url:
            previewUrl,
        },
      }))

      return true
    }

    if (!existingCheckIn?.id) {
      setError(
        'A Weekly Check-In draft could not be found.',
      )
      return false
    }

    setUploadingPose(pose)

    try {
      await uploadWeeklyCheckInPhoto({
        coachingPlanId: plan.id,
        weeklyCheckInId:
          existingCheckIn.id,
        pose,
        sideView:
          pose === 'side'
            ? getSavedMeasurementSide(
                plan,
              )
            : null,
        file,
      })

      const loadedPhotos =
        await loadWeeklyCheckInPhotos(
          existingCheckIn.id,
        )

      setPhotos(
        mapPhotosByPose(
          loadedPhotos,
        ),
      )
      setSaveMessage(
        'Photo saved',
      )

      return true
    } catch (uploadError) {
      logDevelopmentError(
        'useWeeklyCheckIn.uploadPhoto',
        uploadError,
      )
      setError(
        getErrorMessage(
          uploadError,
          'Your progress photo could not be saved.',
        ),
      )

      return false
    } finally {
      setUploadingPose('')
    }
  }

  async function submitCheckIn() {
    if (
      !persistenceEnabled ||
      !existingCheckIn?.id ||
      isCompleted
    ) {
      return false
    }

    setSaving(true)
    setError('')
    setSaveMessage('Submitting...')

    try {
      await saveWeeklyCheckInDraft(
        existingCheckIn.id,
        {
          form,
          resumeStep: 'review',
          photosRequired,
          bodyFatSource,
        },
      )

      const daily =
        await saveDailyCheckInForDate(
          activeCheckInDate,
          buildDailyValues({
            plan,
            form,
            settings,
          }),
        )

      const completed =
        await completeWeeklyCheckIn(
          existingCheckIn.id,
          {
            dailyCheckInId:
              daily.id,
            form,
            structuredValues:
              buildWeeklyValues({
                form,
                plan,
                unitSystem,
                bodyFatSource,
                estimatedBodyFat,
                photosRequired,
              }),
          },
        )

      setExistingCheckIn(
        completed,
      )
      setSaveMessage('Submitted')
      await onSaved?.(completed)

      return true
    } catch (submitError) {
      logDevelopmentError(
        'useWeeklyCheckIn.submitCheckIn',
        submitError,
      )
      setSaveMessage('')
      setError(
        getErrorMessage(
          submitError,
          'Your Weekly Check-In could not be submitted.',
        ),
      )

      return false
    } finally {
      setSaving(false)
    }
  }

  function resetPreview() {
    if (persistenceEnabled) {
      return
    }

    for (
      const url of
      localPhotoUrls.current
    ) {
      URL.revokeObjectURL(url)
    }
    localPhotoUrls.current.clear()

    setForm(
      buildInitialForm(
        plan,
        bodyFatSource,
        null,
      ),
    )
    setPhotos({
      ...EMPTY_PHOTOS,
    })
    setResumeStep(
      WEEKLY_CHECKIN_STEP_IDS
        .GET_STARTED,
    )
    clearMessages()
  }

  return {
    // `today` remains as a compatibility alias for the check-in
    // date used by the existing Weekly UI/tests. A late Weekly
    // deliberately points at its scheduled historical date.
    today: activeCheckInDate,
    checkInDate: activeCheckInDate,
    currentDate,
    weekNumber,
    photosRequired,
    isFinalWeekly,
    persistenceEnabled,
    existingCheckIn,
    isCompleted,
    resumeStep,
    form,
    photos,
    estimatedBodyFat,
    reviewBodyFatSource,
    reviewEstimatedBodyFat,
    loading,
    saving,
    uploadingPose,
    error,
    saveMessage,
    setField,
    saveDraft,
    uploadPhoto,
    submitCheckIn,
    resetPreview,
    clearMessages,
    reload: loadCheckIn,
  }
}
