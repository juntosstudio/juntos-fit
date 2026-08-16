import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  loadDailyCheckInForDate,
  saveDailyCheckInForDate,
} from '../services/dailyCheckInService'
import {
  clearDailyDataResolution,
  getCatchUpDailyEligibility,
} from '../services/checkInHistoryService'
import {
  getDailyCheckInValidationError,
  MEAL_PLAN_DEVIATION_TYPES as DEVIATION,
} from '../utils/dailyCheckInFlow'
import {
  normalizeCheckInSettings,
} from '../utils/checkInTracking'

export const CATCH_UP_EMPTY_FORM = {
  morning_weight: '',
  weight_status: '',
  meal_plan_score: '',
  meal_plan_deviation_type: '',
  meal_plan_deviation_details: '',
  planned_cheat_meal_status: '',
  hunger_score: '',
  water_goal_met: null,
  workout_status: '',
  workout_incomplete_reason: '',
  training_problem: null,
  training_problem_details: '',
  cardio_minutes: '0',
  alcohol_consumed: null,
  alcohol_details: '',
  coach_notes: '',
  additional_notes: '',
  questions_for_coach: '',
}

function optionalText(value = '') {
  const trimmed = String(value ?? '').trim()
  return trimmed || null
}

export function useCatchUpDailyCheckIn({
  plan,
  checkinDate,
  trackingSettings,
  onSaved,
}) {
  const [form, setForm] = useState({
    ...CATCH_UP_EMPTY_FORM,
  })
  const [eligibility, setEligibility] =
    useState(null)
  const [loading, setLoading] =
    useState(true)
  const [saving, setSaving] =
    useState(false)
  const [error, setError] =
    useState('')

  const {
    track_water: trackWater,
    track_alcohol: trackAlcohol,
  } = normalizeCheckInSettings(
    trackingSettings,
  )

  const load = useCallback(async () => {
    if (!plan?.id || !checkinDate) {
      setEligibility({
        allowed: false,
        reason:
          'A Daily Check-In date could not be found.',
      })
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const nextEligibility =
        await getCatchUpDailyEligibility(
          plan,
          checkinDate,
        )

      setEligibility(nextEligibility)

      if (nextEligibility.existingDaily) {
        setError(nextEligibility.reason)
      }
    } catch (loadError) {
      setError(
        loadError?.message ||
          'This missed Daily Check-In could not be loaded.',
      )
    } finally {
      setLoading(false)
    }
  }, [
    plan,
    checkinDate,
  ])

  useEffect(() => {
    load()
  }, [load])

  function setField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
    setError('')
  }

  async function saveCheckIn() {
    if (!eligibility?.allowed) {
      setError(
        eligibility?.reason ||
          'This program week is closed.',
      )
      return false
    }

    const validationError =
      getDailyCheckInValidationError(
        form,
        {
          unitSystem: 'imperial',
          trackingSettings,
        },
      )

    if (validationError) {
      setError(validationError)
      return false
    }

    const mealPlanScore = Number(
      form.meal_plan_score,
    )

    const includedCheatMeal = [
      DEVIATION.CHEAT_ONLY,
      DEVIATION.CHEAT_PLUS,
    ].includes(
      form.meal_plan_deviation_type,
    )

    const needsDeviationDetails =
      mealPlanScore < 5 &&
      form.meal_plan_deviation_type !==
        DEVIATION.CHEAT_ONLY

    const workoutWasMissed =
      form.workout_status === 'missed'

    const workoutWasAttempted = [
      'completed',
      'partial',
    ].includes(form.workout_status)

    setSaving(true)
    setError('')

    try {
      // Re-check immediately before the write so a stale screen
      // cannot modify a week that has since closed.
      const latestEligibility =
        await getCatchUpDailyEligibility(
          plan,
          checkinDate,
        )

      if (!latestEligibility.allowed) {
        throw new Error(
          latestEligibility.reason ||
            'This program week is closed.',
        )
      }

      await saveDailyCheckInForDate(
        checkinDate,
        {
          coaching_plan_id: plan.id,
          morning_weight:
            form.weight_status === 'recorded'
              ? Number(form.morning_weight)
              : null,
          weight_status:
            form.weight_status,
          meal_plan_score:
            mealPlanScore,
          meal_plan_deviation_details:
            needsDeviationDetails
              ? optionalText(
                  form
                    .meal_plan_deviation_details,
                )
              : null,
          planned_cheat_meal_status:
            mealPlanScore < 5
              ? includedCheatMeal
                ? 'eaten'
                : 'not_eaten'
              : null,
          hunger_score: Number(
            form.hunger_score,
          ),
          water_goal_met:
            trackWater
              ? form.water_goal_met
              : null,
          workout_status:
            form.workout_status,
          workout_incomplete_reason:
            workoutWasMissed
              ? optionalText(
                  form
                    .workout_incomplete_reason,
                )
              : null,
          training_problem:
            workoutWasAttempted
              ? form.training_problem
              : null,
          training_problem_details:
            workoutWasAttempted &&
            form.training_problem === true
              ? optionalText(
                  form
                    .training_problem_details,
                )
              : null,
          cardio_minutes: Number(
            form.cardio_minutes || 0,
          ),
          alcohol_consumed:
            trackAlcohol
              ? form.alcohol_consumed
              : null,
          alcohol_details:
            trackAlcohol &&
            form.alcohol_consumed === true
              ? optionalText(
                  form.alcohol_details,
                )
              : null,
          additional_notes:
            optionalText(
              form.coach_notes,
            ),
          questions_for_coach: null,
        },
      )

      // A completed answer always wins over a prior
      // "I don't have this data" resolution.
      await clearDailyDataResolution(
        plan.id,
        checkinDate,
      )

      await onSaved?.()
      return true
    } catch (saveError) {
      setError(
        saveError?.message ||
          'This missed Daily Check-In could not be saved.',
      )
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    form,
    setField,
    eligibility,
    loading,
    saving,
    error,
    saveCheckIn,
  }
}
