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
  getWeeklyCheckInNumber,
} from '../utils/weeklyCheckInFlow'

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

function getInitialBodyFatStatus(plan) {
  if (
    plan?.body_fat_source ===
    'juntos_estimate'
  ) {
    return 'pending_estimate'
  }

  if (
    plan?.body_fat_source === 'none'
  ) {
    return 'not_tracked'
  }

  return ''
}

export function useWeeklyCheckInPreview(
  plan,
) {
  const today = getTodayDateKey()

  const [form, setForm] = useState(
    () => ({
      ...EMPTY_FORM,
      measurement_side:
        getSavedMeasurementSide(plan),
      body_fat_status:
        getInitialBodyFatStatus(plan),
    }),
  )

  const [photos, setPhotos] = useState({
    ...EMPTY_PHOTOS,
  })

  const weekNumber = useMemo(
    () =>
      getWeeklyCheckInNumber(
        plan?.start_date,
        plan?.checkin_day,
        today,
      ) ?? 4,
    [
      plan?.start_date,
      plan?.checkin_day,
      today,
    ],
  )

  // Weekly remains a DEV front-end preview. It
  // intentionally shows a Week 4/full-measurement
  // example so every measurement and photo screen
  // can be reviewed before database submission is
  // connected.
  const photosRequired = true

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
        getInitialBodyFatStatus(plan),
    })
    setPhotos({ ...EMPTY_PHOTOS })
  }

  return {
    today,
    weekNumber,
    photosRequired,
    form,
    photos,
    setField,
    addPreviewPhoto,
    resetPreview,
  }
}
