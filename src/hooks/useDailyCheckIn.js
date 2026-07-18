import { useCallback, useEffect, useState } from 'react'
import {
  loadTodayDailyCheckIn,
  saveTodayDailyCheckIn,
} from '../services/dailyCheckInService'
import {
  addDays,
  getTodayDateKey,
} from '../utils/dates'
import { formatDate } from '../utils/formatters'
import {
  getErrorMessage,
  logDevelopmentError,
} from '../utils/errors'

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
}

// Converts a database row into input-friendly form values.
function mapCheckInToForm(checkin) {
  if (!checkin) {
    return { ...EMPTY_FORM }
  }

  return {
    morning_weight:
      checkin.morning_weight?.toString() ?? '',
    weight_status:
      checkin.weight_status ?? '',
    meal_plan_score:
      checkin.meal_plan_score?.toString() ?? '',
    meal_plan_deviation_details:
      checkin.meal_plan_deviation_details ?? '',
    planned_cheat_meal_status:
      checkin.planned_cheat_meal_status ?? '',
    hunger_score:
      checkin.hunger_score?.toString() ?? '',
    water_goal_met: checkin.water_goal_met,
    workout_status: checkin.workout_status ?? '',
    workout_incomplete_reason:
      checkin.workout_incomplete_reason ?? '',
    training_problem: checkin.training_problem,
    training_problem_details:
      checkin.training_problem_details ?? '',
    cardio_minutes:
      checkin.cardio_minutes?.toString() ?? '0',
    alcohol_consumed: checkin.alcohol_consumed,
    alcohol_details: checkin.alcohol_details ?? '',
    additional_notes: checkin.additional_notes ?? '',
    questions_for_coach:
      checkin.questions_for_coach ?? '',
  }
}

// Converts blank text into a database-friendly null.
function optionalText(value) {
  const trimmedValue = value.trim()

  return trimmedValue || null
}

// Loads, edits, validates, and saves today's check-in.
export function useDailyCheckIn(plan, onSaved) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
  })
  const [existingCheckIn, setExistingCheckIn] =
    useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] =
    useState('')

  const today = getTodayDateKey()
  const firstCheckInDate = plan?.start_date
    ? addDays(plan.start_date, 1)
    : null

  const planHasStarted =
    Boolean(firstCheckInDate) &&
    today >= firstCheckInDate

  const canEdit = Boolean(plan?.id) && planHasStarted

  const loadCheckIn = useCallback(async () => {
    if (!plan?.id || !planHasStarted) {
      setForm({ ...EMPTY_FORM })
      setExistingCheckIn(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const checkin =
        await loadTodayDailyCheckIn(plan.id)

      setExistingCheckIn(checkin)
      setForm(mapCheckInToForm(checkin))
    } catch (loadError) {
      logDevelopmentError(
        'useDailyCheckIn.loadCheckIn',
        loadError,
      )

      setError(
        getErrorMessage(
          loadError,
          'Today’s daily check-in could not be loaded.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [plan?.id, planHasStarted])

  useEffect(() => {
    loadCheckIn()
  }, [loadCheckIn])

  // Updates one answer and clears old status messages.
  function setField(fieldName, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }))

    setError('')
    setSuccessMessage('')
  }

  function validateCheckIn() {
    if (!plan?.id) {
      return 'No active coaching plan was found.'
    }

    if (!planHasStarted) {
      return (
        'Daily check-ins begin the morning after your ' +
        `program starts. Your first check-in is ${
          formatDate(firstCheckInDate)
        }.`
      )
    }

    if (!form.weight_status) {
      return (
        'Enter your morning weight or choose why you ' +
        'do not have one today.'
     )
    }

    if (
      form.weight_status === 'recorded' &&
      !form.morning_weight
   ) {
     return 'Enter your morning weight.'
   }

    const morningWeight =
      form.weight_status === 'recorded'
        ? Number(form.morning_weight)
        : null

    if (
      morningWeight !== null &&
      (!Number.isFinite(morningWeight) ||
        morningWeight <= 0)
    ) {
      return 'Morning weight must be greater than zero.'
    }

    const mealPlanScore = Number(
      form.meal_plan_score,
    )

    if (
      !Number.isInteger(mealPlanScore) ||
      mealPlanScore < 1 ||
      mealPlanScore > 5
    ) {
      return 'Choose how closely you followed your meal plan.'
    }

    if (
      mealPlanScore < 5 &&
      !form.meal_plan_deviation_details.trim()
    ) {
      return (
        'Describe what was different from your meal ' +
        'plan and why.'
      )
    }

    if (mealPlanScore < 5 && !form.planned_cheat_meal_status) {
      return "Choose whether you had a planned cheat meal.";
    }

    const hungerScore = Number(form.hunger_score)

    if (
      !Number.isInteger(hungerScore) ||
      hungerScore < 1 ||
      hungerScore > 5
    ) {
      return 'Choose your overall hunger level.'
    }

    if (form.water_goal_met === null) {
      return 'Choose whether you hit your water goal.'
    }

    if (!form.workout_status) {
      return 'Choose your workout status.'
    }

    const workoutWasMissed = form.workout_status === "missed";

    const workoutWasAttempted = ["completed", "partial"].includes(
      form.workout_status,
    );

    if (workoutWasMissed && !form.workout_incomplete_reason.trim()) {
      return "Describe what prevented you from completing " + "your workout.";
    }

    if (
      workoutWasAttempted &&
      form.training_problem === true &&
      !form.training_problem_details.trim()
    ) {
      return 'Describe what happened during training.'
    }

    const cardioMinutes = Number(
      form.cardio_minutes || 0,
    )

    if (
      !Number.isInteger(cardioMinutes) ||
      cardioMinutes < 0 ||
      cardioMinutes > 1440
    ) {
      return (
        'Cardio minutes must be a whole number between ' +
        '0 and 1,440.'
      )
    }

    if (form.alcohol_consumed === null) {
      return 'Choose whether you drank alcohol.'
    }

    if (
      form.alcohol_consumed === true &&
      !form.alcohol_details.trim()
    ) {
      return 'Enter what you drank and how much.'
    }

    return ''
  }

  async function saveCheckIn() {
    const validationError = validateCheckIn()

    if (validationError) {
      setError(validationError)
      return false
    }

    const mealPlanScore = Number(
      form.meal_plan_score,
    )
    const workoutWasMissed = form.workout_status === "missed";

    const workoutWasAttempted = ["completed", "partial"].includes(
      form.workout_status,
    );

    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const savedCheckIn = await saveTodayDailyCheckIn({
        coaching_plan_id: plan.id,
        checkin_date: today,
        morning_weight:
          form.weight_status === "recorded"
            ? Number(form.morning_weight)
            : null,
        weight_status: form.weight_status,
        meal_plan_score: mealPlanScore,
        meal_plan_deviation_details:
          mealPlanScore < 5
            ? optionalText(form.meal_plan_deviation_details)
            : null,
        planned_cheat_meal_status: form.planned_cheat_meal_status,
        hunger_score: Number(form.hunger_score),
        water_goal_met: form.water_goal_met,
        workout_status: form.workout_status,
        workout_incomplete_reason: workoutWasMissed
          ? optionalText(form.workout_incomplete_reason)
          : null,
        training_problem: workoutWasAttempted ? form.training_problem : null,
        training_problem_details:
          workoutWasAttempted && form.training_problem === true
            ? optionalText(form.training_problem_details)
            : null,
        cardio_minutes: Number(form.cardio_minutes || 0),
        alcohol_consumed: form.alcohol_consumed,
        alcohol_details:
          form.alcohol_consumed === true
            ? optionalText(form.alcohol_details)
            : null,
        additional_notes: optionalText(form.additional_notes),
        questions_for_coach: optionalText(form.questions_for_coach),
      });

      setExistingCheckIn(savedCheckIn)
      setForm(mapCheckInToForm(savedCheckIn))
      setSuccessMessage(
        'Today’s check-in was saved.',
      )

      await onSaved?.()

      return true
    } catch (saveError) {
      logDevelopmentError(
        'useDailyCheckIn.saveCheckIn',
        saveError,
      )

      setError(
        getErrorMessage(
          saveError,
          'Today’s daily check-in could not be saved.',
        ),
      )

      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    today,
    firstCheckInDate,
    form,
    existingCheckIn,
    loading,
    saving,
    error,
    successMessage,
    canEdit,
    planHasStarted,
    setField,
    saveCheckIn,
  }
}