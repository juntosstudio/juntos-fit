import { ChoiceButtons } from '../checkin/QuestionControls'
import {
  CREATE_PLAN_STEP_IDS as STEP,
  GOAL_OPTIONS,
  WEEKDAY_OPTIONS,
} from '../../utils/createPlanFlow'

function fieldState(value) {
  const isUnanswered =
    value === '' ||
    value === null ||
    value === undefined

  return isUnanswered
    ? 'needs-answer'
    : 'has-answer'
}

function NumberField({
  label,
  name,
  value,
  suffix,
  min,
  max,
  onChange,
}) {
  return (
    <label className="create-plan-number-field">
      <span>{label}</span>

      <div className="number-answer">
        <input
          className={`interaction-field ${fieldState(
            value,
          )}`}
          type="number"
          inputMode="numeric"
          name={name}
          min={min}
          max={max}
          step="1"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />

        {suffix && <span>{suffix}</span>}
      </div>
    </label>
  )
}

// Displays the active Create Plan wizard question.
export function CreatePlanStep({
  step,
  form,
  today,
  setField,
}) {
  if (step === STEP.GOAL) {
    return (
      <fieldset>
        <legend>What is your primary goal?</legend>

        <div
          className={`create-plan-choice-group ${fieldState(
            form.goal,
          )}`}
        >
          <ChoiceButtons
            name="plan-goal"
            value={form.goal}
            options={GOAL_OPTIONS}
            onChange={(value) =>
              setField('goal', value)
            }
          />
        </div>
      </fieldset>
    )
  }

  if (step === STEP.START_DATE) {
    return (
      <fieldset>
        <legend>When does your plan start?</legend>

        <p className="question-helper">
          Your Start Check-In will be due on this date.
        </p>

        <label className="create-plan-date-field">
          <span>Plan start date</span>

          <input
            className={`interaction-field ${fieldState(
              form.start_date,
            )}`}
            type="date"
            name="start-date"
            min={today}
            value={form.start_date}
            onChange={(event) =>
              setField(
                'start_date',
                event.target.value,
              )
            }
          />
        </label>
      </fieldset>
    )
  }

  if (step === STEP.LENGTH) {
    return (
      <fieldset>
        <legend>How many weeks is your plan?</legend>

        <p className="question-helper">
          Eight and twelve weeks are common choices.
        </p>

        <NumberField
          label="Program length"
          name="program-length"
          value={form.program_length_weeks}
          suffix="weeks"
          min="1"
          max="52"
          onChange={(value) =>
            setField(
              'program_length_weeks',
              value,
            )
          }
        />
      </fieldset>
    )
  }

  if (step === STEP.CHECKIN_DAY) {
    return (
      <fieldset>
        <legend>
          Which day should be your weekly check-in?
        </legend>

        <p className="question-helper">
          We defaulted this to the weekday your plan
          starts. You may choose another day.
        </p>

        <div
          className={`create-plan-choice-group ${fieldState(
            form.checkin_day,
          )}`}
        >
          <ChoiceButtons
            name="weekly-checkin-day"
            value={form.checkin_day}
            options={WEEKDAY_OPTIONS}
            onChange={(value) =>
              setField('checkin_day', value)
            }
          />
        </div>
      </fieldset>
    )
  }

  if (step === STEP.NUTRITION) {
    return (
      <fieldset>
        <legend>Enter your nutrition targets.</legend>

        <p className="question-helper">
          Use the numbers from your trainer or the
          targets you already follow.
        </p>

        <div className="create-plan-field-grid">
          <NumberField
            label="Daily calories"
            name="calorie-target"
            value={form.calorie_target}
            suffix="kcal"
            min="1"
            max="10000"
            onChange={(value) =>
              setField('calorie_target', value)
            }
          />

          <NumberField
            label="Protein"
            name="protein-target"
            value={form.protein_grams}
            suffix="g"
            min="0"
            max="1000"
            onChange={(value) =>
              setField('protein_grams', value)
            }
          />

          <NumberField
            label="Carbohydrates"
            name="carb-target"
            value={form.carb_grams}
            suffix="g"
            min="0"
            max="1000"
            onChange={(value) =>
              setField('carb_grams', value)
            }
          />

          <NumberField
            label="Fat"
            name="fat-target"
            value={form.fat_grams}
            suffix="g"
            min="0"
            max="1000"
            onChange={(value) =>
              setField('fat_grams', value)
            }
          />
        </div>
      </fieldset>
    )
  }

  return (
    <fieldset>
      <legend>Enter your weekly activity goals.</legend>

      <div className="create-plan-field-grid">
        <NumberField
          label="Scheduled workouts"
          name="weekly-workouts"
          value={form.weekly_workout_target}
          suffix="per week"
          min="0"
          max="14"
          onChange={(value) =>
            setField(
              'weekly_workout_target',
              value,
            )
          }
        />

        <NumberField
          label="Cardio"
          name="weekly-cardio"
          value={
            form.weekly_cardio_target_minutes
          }
          suffix="min/week"
          min="0"
          max="3000"
          onChange={(value) =>
            setField(
              'weekly_cardio_target_minutes',
              value,
            )
          }
        />

        <NumberField
          label="Daily water"
          name="daily-water"
          value={form.daily_water_goal_oz}
          suffix="oz/day"
          min="1"
          max="500"
          onChange={(value) =>
            setField(
              'daily_water_goal_oz',
              value,
            )
          }
        />
      </div>
    </fieldset>
  )
}
