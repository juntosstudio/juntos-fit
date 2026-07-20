import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  completeStartCheckIn,
  createStartCheckInDraft,
  loadBodyFatProfile,
  savePlanMeasurementPreferences,
  saveStartCheckInMeasurements,
} from '../services/startCheckInService'
import {
  loadStartCheckInPhotos,
  uploadStartCheckInPhoto,
} from '../services/startCheckInPhotoService'
import { calculateJuntosBodyFatEstimate } from '../utils/bodyFat'
import {
  fromCanonicalMeasurement,
  normalizeUnitSystem,
  toCanonicalMeasurement,
} from '../utils/measurementUnits'
import { getMeasurementValidation } from '../utils/measurementValidation'
import {
  getBrowserTimeZone,
  getDateKeyForTimeZone,
} from '../utils/timeZone'
import { formatDate } from '../utils/formatters'
import {
  getErrorMessage,
  logDevelopmentError,
} from '../utils/errors'

const EMPTY_FORM = {
  starting_weight_lbs: '',
  body_fat_percent: '',
  body_fat_unavailable: false,
  neck_inches: '',
  chest_inches: '',
  waist_inches: '',
  hips_inches: '',
  measurement_side: '',
  upper_arm_inches: '',
  thigh_inches: '',
  calf_inches: '',
}

const MEASUREMENT_FIELDS = [
  'starting_weight_lbs',
  'neck_inches',
  'chest_inches',
  'waist_inches',
  'hips_inches',
  'upper_arm_inches',
  'thigh_inches',
  'calf_inches',
]

const REQUIRED_FIELDS = [
  ['starting_weight_lbs', 'starting weight'],
  ['neck_inches', 'neck measurement'],
  ['chest_inches', 'chest measurement'],
  ['waist_inches', 'waist measurement'],
  ['hips_inches', 'hips measurement'],
  ['upper_arm_inches', 'upper-arm measurement'],
  ['thigh_inches', 'thigh measurement'],
  ['calf_inches', 'calf measurement'],
]

const EMPTY_PHOTOS = {
  front: null,
  side: null,
  back: null,
}

function mapCheckInToForm(
  checkin,
  plan,
  unitSystem,
) {
  const form = {
    ...EMPTY_FORM,
    measurement_side:
      plan?.measurement_side ?? '',
  }

  if (!checkin) {
    return form
  }

  for (const field of MEASUREMENT_FIELDS) {
    form[field] = fromCanonicalMeasurement(
      field,
      checkin[field],
      unitSystem,
    )
  }

  form.body_fat_percent =
    checkin.body_fat_percent === null ||
    checkin.body_fat_percent === undefined
      ? ''
      : Number(
          checkin.body_fat_percent,
        ).toFixed(1)

  form.body_fat_unavailable =
    checkin.body_fat_status === 'unavailable'

  return form
}

function mapPhotosByPose(photos) {
  const result = { ...EMPTY_PHOTOS }

  for (const photo of photos) {
    result[photo.pose] = photo
  }

  return result
}

function buildCanonicalMeasurements(
  form,
  unitSystem,
) {
  return Object.fromEntries(
    MEASUREMENT_FIELDS.map((field) => [
      field,
      toCanonicalMeasurement(
        field,
        form[field],
        unitSystem,
      ),
    ]),
  )
}

// Loads and manages one plan's Start Check-In.
export function useStartCheckIn(
  plan,
  onSaved,
) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
  })
  const [savedForm, setSavedForm] = useState({
    ...EMPTY_FORM,
  })
  const [existingCheckIn, setExistingCheckIn] =
    useState(null)
  const [profile, setProfile] = useState(null)
  const [photos, setPhotos] = useState({
    ...EMPTY_PHOTOS,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPose, setUploadingPose] =
    useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] =
    useState('')

  const unitSystem = normalizeUnitSystem(
    profile?.unit_system,
  )
  const timeZone =
    plan?.time_zone ||
    profile?.time_zone ||
    getBrowserTimeZone()
  const today =
    getDateKeyForTimeZone(timeZone)
  const planHasStarted =
    Boolean(plan?.start_date) &&
    today >= plan.start_date
  const isCompleted =
    existingCheckIn?.status === 'completed'
  const editWindowClosed =
    isCompleted && today > plan.start_date
  const canEdit =
    Boolean(plan?.id) &&
    planHasStarted &&
    !editWindowClosed
  const isReadOnly =
    isCompleted && editWindowClosed

  const estimatedBodyFat = useMemo(() => {
    if (
      plan?.body_fat_source !==
      'juntos_estimate'
    ) {
      return null
    }

    return calculateJuntosBodyFatEstimate({
      weightLbs: toCanonicalMeasurement(
        'starting_weight_lbs',
        form.starting_weight_lbs,
        unitSystem,
      ),
      heightCm: profile?.height_cm,
      dateOfBirth: profile?.date_of_birth,
      sex: profile?.sex,
      asOfDate: plan.start_date,
    })
  }, [
    form.starting_weight_lbs,
    plan?.body_fat_source,
    plan?.start_date,
    profile,
    unitSystem,
  ])

  const loadCheckIn = useCallback(async () => {
    if (!plan?.id || !planHasStarted) {
      const empty = { ...EMPTY_FORM }

      setForm(empty)
      setSavedForm(empty)
      setExistingCheckIn(null)
      setProfile(null)
      setPhotos({ ...EMPTY_PHOTOS })
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const [checkin, loadedProfile] =
        await Promise.all([
          createStartCheckInDraft(
            plan.id,
            plan.start_date,
          ),
          loadBodyFatProfile(plan.user_id),
        ])

      const loadedUnitSystem =
        normalizeUnitSystem(
          loadedProfile?.unit_system,
        )
      const loadedPhotos =
        await loadStartCheckInPhotos(checkin.id)
      const loadedForm =
        mapCheckInToForm(
          checkin,
          plan,
          loadedUnitSystem,
        )

      setExistingCheckIn(checkin)
      setProfile(loadedProfile)
      setForm(loadedForm)
      setSavedForm(loadedForm)
      setPhotos(mapPhotosByPose(loadedPhotos))
    } catch (loadError) {
      logDevelopmentError(
        'useStartCheckIn.loadCheckIn',
        loadError,
      )

      setError(
        getErrorMessage(
          loadError,
          'Your Start Check-In could not be loaded.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [
    plan?.id,
    plan?.start_date,
    plan?.user_id,
    plan?.measurement_side,
    planHasStarted,
  ])

  useEffect(() => {
    loadCheckIn()
  }, [loadCheckIn])

  function clearMessages() {
    setError('')
    setSuccessMessage('')
  }

  function setField(fieldName, value) {
    setForm((current) => {
      if (fieldName === 'body_fat_unavailable') {
        return {
          ...current,
          body_fat_unavailable: value,
          body_fat_percent: value
            ? ''
            : current.body_fat_percent,
        }
      }

      if (fieldName === 'body_fat_percent') {
        return {
          ...current,
          body_fat_percent: value,
          body_fat_unavailable: false,
        }
      }

      return {
        ...current,
        [fieldName]: value,
      }
    })

    clearMessages()
  }

  function validateEnteredMeasurements() {
    for (const field of MEASUREMENT_FIELDS) {
      const result = getMeasurementValidation({
        field,
        value: form[field],
        unitSystem,
      })

      if (result.status === 'invalid') {
        return result.message
      }
    }

    if (
      plan.body_fat_source === 'scale' &&
      !form.body_fat_unavailable &&
      form.body_fat_percent !== ''
    ) {
      const result = getMeasurementValidation({
        field: 'body_fat_percent',
        value: form.body_fat_percent,
        unitSystem,
      })

      if (result.status === 'invalid') {
        return result.message
      }
    }

    return ''
  }

  function validateCompletion() {
    if (!plan?.id) {
      return 'No active coaching plan was found.'
    }

    if (!planHasStarted) {
      return (
        'Your Start Check-In will be available on ' +
        `${formatDate(plan.start_date)}.`
      )
    }

    if (!canEdit) {
      return 'This starting baseline is now locked.'
    }

    const enteredError =
      validateEnteredMeasurements()

    if (enteredError) {
      return enteredError
    }

    for (const [field, label] of REQUIRED_FIELDS) {
      if (form[field] === '') {
        return `Enter your ${label}.`
      }
    }

    if (!form.measurement_side) {
      return 'Choose the side you will track.'
    }

    if (plan.body_fat_source === 'scale') {
      if (
        !form.body_fat_unavailable &&
        form.body_fat_percent === ''
      ) {
        return (
          'Enter your scale body-fat reading or ' +
          'choose that you do not have one today.'
        )
      }
    }

    if (
      plan.body_fat_source ===
        'juntos_estimate' &&
      !estimatedBodyFat
    ) {
      return (
        'Juntos Fit could not calculate the estimate. ' +
        'Check the profile height, birth date, and sex.'
      )
    }

    if (!photos.front) {
      return 'Add your front progress photo.'
    }

    if (
      !photos.side ||
      photos.side.side_view !==
        form.measurement_side
    ) {
      return (
        `Add a ${form.measurement_side} side ` +
        'progress photo.'
      )
    }

    if (!photos.back) {
      return 'Add your back progress photo.'
    }

    return ''
  }

  function buildBodyFatValues() {
    if (plan.body_fat_source === 'none') {
      return {
        body_fat_percent: null,
        body_fat_status: 'not_tracked',
        body_fat_method: null,
        body_fat_formula_version: null,
      }
    }

    if (
      plan.body_fat_source ===
      'juntos_estimate'
    ) {
      return {
        body_fat_percent:
          estimatedBodyFat?.percent ?? null,
        body_fat_status: 'estimated',
        body_fat_method: 'juntos_estimate',
        body_fat_formula_version:
          estimatedBodyFat?.formulaVersion ??
          null,
      }
    }

    if (form.body_fat_unavailable) {
      return {
        body_fat_percent: null,
        body_fat_status: 'unavailable',
        body_fat_method: null,
        body_fat_formula_version: null,
      }
    }

    return {
      body_fat_percent:
        form.body_fat_percent,
      body_fat_status:
        form.body_fat_percent === ''
          ? null
          : 'recorded',
      body_fat_method:
        form.body_fat_percent === ''
          ? null
          : 'scale',
      body_fat_formula_version: null,
    }
  }

  async function saveCheckIn({
    complete = false,
  } = {}) {
    if (!existingCheckIn?.id) {
      setError('A Start Check-In could not be found.')
      return false
    }

    if (!canEdit) {
      setError('This starting baseline is now locked.')
      return false
    }

    const validationError = complete
      ? validateCompletion()
      : validateEnteredMeasurements()

    if (validationError) {
      setError(validationError)
      return false
    }

    setSaving(true)
    clearMessages()

    try {
      if (form.measurement_side) {
        await savePlanMeasurementPreferences(
          plan.id,
          {
            measurementSide:
              form.measurement_side,
            timeZone,
          },
        )
      }

      let saved =
        await saveStartCheckInMeasurements(
          existingCheckIn.id,
          {
            ...buildCanonicalMeasurements(
              form,
              unitSystem,
            ),
            ...buildBodyFatValues(),
          },
        )

      if (
        complete &&
        saved.status !== 'completed'
      ) {
        saved = await completeStartCheckIn(
          existingCheckIn.id,
        )
      }

      const updatedForm =
        mapCheckInToForm(
          saved,
          {
            ...plan,
            measurement_side:
              form.measurement_side,
          },
          unitSystem,
        )

      setExistingCheckIn(saved)
      setForm(updatedForm)
      setSavedForm(updatedForm)
      setSuccessMessage(
        complete
          ? 'Your Start Check-In is complete.'
          : 'Your Start Check-In was saved.',
      )

      await onSaved?.()
      return true
    } catch (saveError) {
      logDevelopmentError(
        'useStartCheckIn.saveCheckIn',
        saveError,
      )

      setError(
        getErrorMessage(
          saveError,
          'Your Start Check-In could not be saved.',
        ),
      )

      return false
    } finally {
      setSaving(false)
    }
  }

  async function uploadPhoto(pose, file) {
    if (!existingCheckIn?.id || !canEdit) {
      setError(
        'This starting baseline cannot be edited.',
      )
      return false
    }

    if (!file) {
      return false
    }

    if (
      pose === 'side' &&
      !form.measurement_side
    ) {
      setError(
        'Choose your measurement side before adding the side photo.',
      )
      return false
    }

    setUploadingPose(pose)
    clearMessages()

    try {
      if (pose === 'side') {
        await savePlanMeasurementPreferences(
          plan.id,
          {
            measurementSide:
              form.measurement_side,
            timeZone,
          },
        )
      }

      await uploadStartCheckInPhoto({
        coachingPlanId: plan.id,
        startCheckInId: existingCheckIn.id,
        pose,
        sideView:
          pose === 'side'
            ? form.measurement_side
            : null,
        file,
      })

      const loadedPhotos =
        await loadStartCheckInPhotos(
          existingCheckIn.id,
        )

      setPhotos(mapPhotosByPose(loadedPhotos))
      setSuccessMessage(
        `${pose[0].toUpperCase()}${pose.slice(1)} photo saved.`,
      )

      return true
    } catch (uploadError) {
      logDevelopmentError(
        'useStartCheckIn.uploadPhoto',
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

  const hasAllPhotos =
    Boolean(photos.front) &&
    Boolean(photos.back) &&
    photos.side?.side_view ===
      form.measurement_side

  const isDirty =
    JSON.stringify(form) !==
    JSON.stringify(savedForm)

  return {
    today,
    timeZone,
    unitSystem,
    form,
    existingCheckIn,
    photos,
    estimatedBodyFat,
    isDirty,
    hasAllPhotos,
    loading,
    saving,
    uploadingPose,
    error,
    successMessage,
    canEdit,
    isReadOnly,
    planHasStarted,
    isCompleted,
    setField,
    clearMessages,
    saveCheckIn,
    uploadPhoto,
    reload: loadCheckIn,
  }
}
