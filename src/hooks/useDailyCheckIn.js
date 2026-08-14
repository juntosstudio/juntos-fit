import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  loadTodayDailyCheckIn,
  saveTodayDailyCheckIn,
} from '../services/dailyCheckInService'
import {
  addDays,
  getTodayDateKey,
} from '../utils/dates'
import {
  formatDate,
} from '../utils/formatters'
import {
  getDailyCheckInValidationError,
  MEAL_PLAN_DEVIATION_TYPES as DEVIATION,
} from '../utils/dailyCheckInFlow'
import {
  normalizeCheckInSettings,
} from '../utils/checkInTracking'
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
  water_goal_met: null,
  workout_status: '',
  workout_incomplete_reason: '',
  training_problem: null,
  training_problem_details: '',
  cardio_minutes: '0',
  alcohol_consumed: null,
  alcohol_details: '',
  coach_notes: '',

  // Legacy database fields are still loaded and saved
  // through the combined coach-notes answer.
  additional_notes: '',
  questions_for_coach: '',
}

function deriveDeviationType(checkin) {
  const score = Number(
    checkin?.meal_plan_score,
  )

  if (score < 1 || score > 4) {
    return ''
  }

  if (
    checkin.planned_cheat_meal_status ===
    'eaten'
  ) {
    return checkin
      .meal_plan_deviation_details
      ? DEVIATION.CHEAT_PLUS
      : DEVIATION.CHEAT_ONLY
  }

  return DEVIATION.NO_CHEAT
}

function combineCoachNotes(checkin) {
  return [
    checkin?.additional_notes,
    checkin?.questions_for_coach,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function mapCheckInToForm(checkin) {
  if (!checkin) {
    return { ...EMPTY_FORM }
  }

  return {
    ...EMPTY_FORM,
    morning_weight:
      checkin.morning_weight
        ?.toString() ?? '',
    weight_status:
      checkin.weight_status ?? '',
    meal_plan_score:
      checkin.meal_plan_score
        ?.toString() ?? '',
    meal_plan_deviation_type:
      deriveDeviationType(checkin),
    meal_plan_deviation_details:
      checkin
        .meal_plan_deviation_details ?? '',
    planned_cheat_meal_status:
      checkin
        .planned_cheat_meal_status ?? '',
    hunger_score:
      checkin.hunger_score
        ?.toString() ?? '',
    water_goal_met:
      checkin.water_goal_met,
    workout_status:
      checkin.workout_status ?? '',
    workout_incomplete_reason:
      checkin
        .workout_incomplete_reason ?? '',
    training_problem:
      checkin.training_problem,
    training_problem_details:
      checkin
        .training_problem_details ?? '',
    cardio_minutes:
      checkin.cardio_minutes
        ?.toString() ?? '0',
    alcohol_consumed:
      checkin.alcohol_consumed,
    alcohol_details:
      checkin.alcohol_details ?? '',
    coach_notes:
      combineCoachNotes(checkin),
    additional_notes:
      checkin.additional_notes ?? '',
    questions_for_coach:
      checkin.questions_for_coach ?? '',
  }
}

function optionalText(value = '') {
  const trimmedValue = value.trim()

  return trimmedValue || null
}

export function useDailyCheckIn(
  plan,
  onSaved,
  trackingSettings,
) {
  const {
    track_water: trackWater,
    track_alcohol: trackAlcohol,
  } = normalizeCheckInSettings(
    trackingSettings,
  )
  const [form, setForm] = useState({
    ...EMPTY_FORM,
  })
  const [
    existingCheckIn,
    setExistingCheckIn,
  ] = useState(null)
  const [savedForm, setSavedForm] =
    useState({
      ...EMPTY_FORM,
    })
  const [loading, setLoading] =
    useState(false)
  const [saving, setSaving] =
    useState(false)
  const [error, setError] =
    useState('')
  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  const today = getTodayDateKey()
  const firstCheckInDate =
    plan?.start_date
      ? addDays(plan.start_date, 1)
      : null

  const planHasStarted =
    Boolean(firstCheckInDate) &&
    today >= firstCheckInDate

  const canEdit =
    Boolean(plan?.id) &&
    planHasStarted

  const loadCheckIn =
    useCallback(async () => {
      if (
        !plan?.id ||
        !planHasStarted
      ) {
        const emptyForm = {
          ...EMPTY_FORM,
        }

        setForm(emptyForm)
        setSavedForm(emptyForm)
        setExistingCheckIn(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const checkin =
          await loadTodayDailyCheckIn(
            plan.id,
          )

        const loadedForm =
          mapCheckInToForm(checkin)

        setExistingCheckIn(checkin)
        setForm(loadedForm)
        setSavedForm(loadedForm)
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
    }, [
      plan?.id,
      planHasStarted,
    ])

  useEffect(() => {
    loadCheckIn()
  }, [loadCheckIn])

  function setField(
    fieldName,
    value,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }))

    setError('')
    setSuccessMessage('')
  }

  function validateCheckIn() {
    if (!plan?.id) {
      return (
        'No active coaching plan was found.'
      )
    }

    if (!planHasStarted) {
      return (
        'Daily check-ins begin the morning after your ' +
        `program starts. Your first check-in is ${
          formatDate(firstCheckInDate)
        }.`
      )
    }

    return getDailyCheckInValidationError(
      form,
      {
        unitSystem: 'imperial',
        trackingSettings,
      },
    )
  }

  async function saveCheckIn() {
    const validationError =
      validateCheckIn()

    if (validationError) {
      setError(validationError)
      return false
    }

    const mealPlanScore = Number(
      form.meal_plan_score,
    )

    const deviationType =
      form.meal_plan_deviation_type

    const includedCheatMeal = [
      DEVIATION.CHEAT_ONLY,
      DEVIATION.CHEAT_PLUS,
    ].includes(deviationType)

    const needsDeviationDetails =
      mealPlanScore < 5 &&
      deviationType !==
        DEVIATION.CHEAT_ONLY

    const workoutWasMissed =
      form.workout_status === 'missed'

    const workoutWasAttempted = [
      'completed',
      'partial',
    ].includes(form.workout_status)

    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const savedCheckIn =
        await saveTodayDailyCheckIn({
          coaching_plan_id:
            plan.id,
          checkin_date: today,
          morning_weight:
            form.weight_status ===
            'recorded'
              ? Number(
                  form.morning_weight,
                )
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
              : existingCheckIn
                  ?.water_goal_met ?? null,
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
              : existingCheckIn
                  ?.alcohol_consumed ?? null,
          alcohol_details:
            trackAlcohol
              ? form.alcohol_consumed ===
                true
                ? optionalText(
                    form.alcohol_details,
                  )
                : null
              : existingCheckIn
                  ?.alcohol_details ?? null,

          // Store the combined answer in the existing
          // additional_notes column. No migration needed.
          additional_notes:
            optionalText(
              form.coach_notes,
            ),
          questions_for_coach: null,
        })

      const updatedForm =
        mapCheckInToForm(savedCheckIn)

      setExistingCheckIn(
        savedCheckIn,
      )
      setForm(updatedForm)
      setSavedForm(updatedForm)
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

  const isDirty =
    JSON.stringify(form) !==
    JSON.stringify(savedForm)

  return {
    today,
    firstCheckInDate,
    form,
    existingCheckIn,
    isDirty,
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
