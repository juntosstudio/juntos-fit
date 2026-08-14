import {
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
  isFullWeeklyMeasurementCheckIn,
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

function getInitialBodyFatStatus(
  bodyFatSource,
) {
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

export function useWeeklyCheckInPreview(
  plan,
  {
    bodyFatSource,
    unitSystem,
  } = {},
) {
  const today = getTodayDateKey()

  const [form, setForm] = useState(
    () => ({
      ...EMPTY_FORM,
      measurement_side:
        getSavedMeasurementSide(plan),
      body_fat_status:
        getInitialBodyFatStatus(
          bodyFatSource,
        ),
    }),
  )

  const [photos, setPhotos] = useState({
    ...EMPTY_PHOTOS,
  })
  const [
    bodyFatProfile,
    setBodyFatProfile,
  ] = useState(null)

  const weekNumber = useMemo(() => {
    const previewNumber =
      getPreviewWeeklyCheckInNumber(
        plan?.start_date,
        plan?.checkin_day,
        today,
      )

    const planLength = Number(
      plan?.program_length_weeks,
    )

    if (
      Number.isInteger(planLength) &&
      planLength > 0 &&
      previewNumber
    ) {
      return Math.min(
        previewNumber,
        planLength,
      )
    }

    return previewNumber ?? 1
  }, [
    plan?.start_date,
    plan?.checkin_day,
    plan?.program_length_weeks,
    today,
  ])

  const photosRequired = useMemo(
    () =>
      isFullWeeklyMeasurementCheckIn({
        weekNumber,
        programLengthWeeks:
          plan?.program_length_weeks,
        photoFrequencyWeeks:
          plan?.photo_frequency_weeks ?? 4,
      }),
    [
      weekNumber,
      plan?.program_length_weeks,
      plan?.photo_frequency_weeks,
    ],
  )

  const isFinalWeekly =
    Number(weekNumber) ===
    Number(plan?.program_length_weeks)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        const loaded =
          await loadWeeklyBodyFatProfile(
            plan?.user_id,
          )

        if (active) {
          setBodyFatProfile(loaded)
        }
      } catch {
        if (active) {
          setBodyFatProfile(null)
        }
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [plan?.user_id])

  useEffect(() => {
    setForm((current) => {
      const nextStatus =
        getInitialBodyFatStatus(
          bodyFatSource,
        )

      if (
        bodyFatSource === 'scale'
      ) {
        return {
          ...current,
          body_fat_status:
            ['recorded', 'no_reading'].includes(
              current.body_fat_status,
            )
              ? current.body_fat_status
              : '',
        }
      }

      return {
        ...current,
        body_fat_status: nextStatus,
        scale_body_fat_percent: '',
      }
    })
  }, [bodyFatSource])

  const estimatedBodyFat = useMemo(() => {
    if (
      bodyFatSource !==
      'juntos_estimate'
    ) {
      return null
    }

    const canonicalWaist =
      toCanonicalMeasurement(
        'waist_inches',
        form.waist_inches,
        unitSystem,
      )

    return calculateRfmBodyFatEstimate({
      waistInches: canonicalWaist,
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

  const photosRef = useRef(photos)

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(
    () => () => {
      Object.values(
        photosRef.current,
      ).forEach((photo) => {
        if (photo?.preview_url) {
          URL.revokeObjectURL(
            photo.preview_url,
          )
        }
      })
    },
    [],
  )

  function setField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function addPreviewPhoto(pose, file) {
    setPhotos((current) => {
      const previous = current[pose]

      if (previous?.preview_url) {
        URL.revokeObjectURL(
          previous.preview_url,
        )
      }

      return {
        ...current,
        [pose]: {
          name: file.name,
          preview_url:
            URL.createObjectURL(file),
        },
      }
    })
  }

  function resetPreview() {
    Object.values(photos).forEach(
      (photo) => {
        if (photo?.preview_url) {
          URL.revokeObjectURL(
            photo.preview_url,
          )
        }
      },
    )

    setForm({
      ...EMPTY_FORM,
      measurement_side:
        getSavedMeasurementSide(plan),
      body_fat_status:
        getInitialBodyFatStatus(
          bodyFatSource,
        ),
    })
    setPhotos({ ...EMPTY_PHOTOS })
  }

  return {
    today,
    weekNumber,
    photosRequired,
    isFinalWeekly,
    estimatedBodyFat,
    form,
    photos,
    setField,
    addPreviewPhoto,
    resetPreview,
  }
}
