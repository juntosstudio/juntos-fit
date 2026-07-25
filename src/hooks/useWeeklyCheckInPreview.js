import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getTodayDateKey } from '../utils/dates'
import {
  getWeeklyCheckInNumber,
} from '../utils/weeklyCheckInFlow'

const EMPTY_FORM = {
  morning_weight: '',
  weight_status: '',
  meal_plan_score: '',
  meal_plan_deviation_details: '',
  planned_cheat_meal_status: '',
  hunger_score: '',
  water_goal_met: null,
  workout_status: '',
  workout_incomplete_reason: '',
  training_problem: null,
  training_problem_details: '',
  cardio_minutes: '',
  alcohol_consumed: null,
  alcohol_details: '',
  additional_notes: '',
  questions_for_coach: '',
  sleep_quality: '',
  energy_level: '',
  recovery_score: '',
  stress_level: '',
  measurement_side: '',
  neck_inches: '',
  waist_inches: '',
  hips_inches: '',
  bicep_inches: '',
  thigh_inches: '',
  calf_inches: '',
  body_fat_status: '',
  scale_body_fat_percent: '',
  menstrual_cycle_context: '',
  weekly_reflection: '',
}

const EMPTY_PHOTOS = {
  front: null,
  side: null,
  back: null,
}

export function useWeeklyCheckInPreview(plan) {
  const today = getTodayDateKey()

  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    measurement_side:
      plan?.measurement_side ?? '',
    body_fat_status:
      plan?.body_fat_source ===
      'juntos_estimate'
        ? 'pending_estimate'
        : plan?.body_fat_source === 'none'
          ? 'not_tracked'
          : '',
  }))

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

  // DEV preview intentionally uses a Week 4 example
  // so the complete photo flow can be reviewed.
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
    Object.values(photos).forEach((photo) => {
      if (photo?.preview_url) {
        URL.revokeObjectURL(
          photo.preview_url,
        )
      }
    })

    setForm({
      ...EMPTY_FORM,
      measurement_side:
        plan?.measurement_side ?? '',
      body_fat_status:
        plan?.body_fat_source ===
        'juntos_estimate'
          ? 'pending_estimate'
          : plan?.body_fat_source ===
              'none'
            ? 'not_tracked'
            : '',
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
