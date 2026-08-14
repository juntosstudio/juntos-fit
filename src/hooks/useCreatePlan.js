import { useState } from 'react'
import { createCoachingPlan } from '../services/createPlanService'
import {
  saveCheckInSettings,
} from '../services/checkInSettingsService'
import { getTodayDateKey } from '../utils/dates'
import {
  validateCreatePlan,
} from '../utils/createPlanFlow'
import { getBrowserTimeZone } from '../utils/timeZone'
import {
  getErrorMessage,
  logDevelopmentError,
} from '../utils/errors'
import {
  calculateCaloriesFromMacros,
} from '../utils/nutritionTargets'

const EMPTY_FORM = {
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

  function getWeekdayFromDateKey(dateKey) {
    if (!dateKey) {
      return ''
    }

    const [year, month, day] = dateKey
      .split('-')
      .map(Number)

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    ) {
      return ''
    }

    return new Date(
      year,
      month - 1,
      day,
    ).getDay()
  }

  function setField(fieldName, value) {
    if (fieldName === 'checkin_day') {
      setCheckinDayTouched(true)
    }

    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [fieldName]: value,
      }

      if (
        fieldName === 'start_date' &&
        !checkinDayTouched
      ) {
        nextForm.checkin_day =
          getWeekdayFromDateKey(value)
      }

      const isMacroField = [
        'protein_grams',
        'carb_grams',
        'fat_grams',
      ].includes(fieldName)

      if (isMacroField) {
        nextForm.calorie_target =
          calculateCaloriesFromMacros(nextForm)
      }

      return nextForm
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
      await saveCheckInSettings(
        userId,
        {
          track_water: form.track_water,
          track_alcohol: form.track_alcohol,
          body_fat_source:
            form.body_fat_source,
        },
      )

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
