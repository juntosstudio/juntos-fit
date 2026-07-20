import { useState } from 'react'
import { createCoachingPlan } from '../services/createPlanService'
import { getTodayDateKey } from '../utils/dates'
import {
  getDateKeyWeekday,
  validateCreatePlan,
} from '../utils/createPlanFlow'
import { getBrowserTimeZone } from '../utils/timeZone'
import {
  getErrorMessage,
  logDevelopmentError,
} from '../utils/errors'

const EMPTY_FORM = {
  goal: '',
  unit_system: 'imperial',
  body_fat_source: '',
  start_date: '',
  program_length_weeks: '8',
  checkin_day: '',
  calorie_target: '',
  protein_grams: '',
  carb_grams: '',
  fat_grams: '',
  weekly_workout_target: '',
  weekly_cardio_target_minutes: '',
  daily_water_goal_oz: '',
  measurement_frequency_weeks: '1',
  photo_frequency_weeks: '4',
  time_zone: getBrowserTimeZone(),
}

// Owns the Create Plan form, validation, and save.
export function useCreatePlan(
  userId,
  onSaved,
) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
  })
  const [
    checkinDayTouched,
    setCheckinDayTouched,
  ] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdPlanId, setCreatedPlanId] =
    useState(null)

  const today = getTodayDateKey()

  function setField(fieldName, value) {
    if (fieldName === 'checkin_day') {
      setCheckinDayTouched(true)
    }

    setForm((currentForm) => {
      if (fieldName !== 'start_date') {
        return {
          ...currentForm,
          [fieldName]: value,
        }
      }

      const automaticDay =
        getDateKeyWeekday(value)

      return {
        ...currentForm,
        start_date: value,
        checkin_day:
          !checkinDayTouched &&
          automaticDay !== null
            ? automaticDay
            : currentForm.checkin_day,
      }
    })

    setError('')
  }

  async function savePlan() {
    const validation = validateCreatePlan(
      form,
      today,
    )

    if (validation.error) {
      setError(validation.error)

      return {
        saved: false,
        invalidStep: validation.step,
      }
    }

    setSaving(true)
    setError('')

    try {
      const planId = await createCoachingPlan(
        userId,
        form,
      )

      setCreatedPlanId(planId)
      await onSaved?.()

      return {
        saved: true,
        invalidStep: null,
      }
    } catch (saveError) {
      logDevelopmentError(
        'useCreatePlan.savePlan',
        saveError,
      )

      setError(
        getErrorMessage(
          saveError,
          'Your coaching plan could not be created.',
        ),
      )

      return {
        saved: false,
        invalidStep: null,
      }
    } finally {
      setSaving(false)
    }
  }

  return {
    today,
    form,
    saving,
    error,
    createdPlanId,
    setField,
    savePlan,
  }
}
