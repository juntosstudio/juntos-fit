const MEAL_PLAN_OPTIONS = [
  { value: '5', label: '5 — Followed it exactly' },
  { value: '4', label: '4 — One small deviation' },
  { value: '3', label: '3 — Several deviations' },
  { value: '2', label: '2 — Significantly off plan' },
  { value: '1', label: '1 — Did not follow it' },
]

const HUNGER_OPTIONS = [
  { value: '1', label: '1 — Not hungry' },
  { value: '2', label: '2 — Slightly hungry' },
  { value: '3', label: '3 — Manageable hunger' },
  { value: '4', label: '4 — Very hungry' },
  { value: '5', label: '5 — Extremely hungry' },
]

const CHEAT_MEAL_OPTIONS = [
  {
    value: 'eaten',
    label: 'Yes — I had my planned cheat meal',
  },
  {
    value: 'not_eaten',
    label: 'No — I did not have the planned cheat meal',
  },
  {
    value: 'not_planned',
    label: 'No cheat meal was planned',
  },
]

const WORKOUT_OPTIONS = [
  {
    value: 'completed',
    label: 'Yes — completed',
  },
  {
    value: 'partial',
    label: 'Partially completed',
  },
  {
    value: 'missed',
    label: 'No — did not complete it',
  },
  {
    value: 'rest_day',
    label: 'Rest day / no workout scheduled',
  },
]

// Displays one group of radio-button choices.
function ChoiceList({
  name,
  value,
  options,
  onChange,
}) {
  return (
    <div className="choice-list">
      {options.map((option) => (
        <label key={String(option.value)}>
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />

          {option.label}
        </label>
      ))}
    </div>
  )
}

// Displays the active question in the daily check-in wizard.
export function DailyCheckInQuestion({
  step,
  form,
  setField,
  target,
  cardioCompleted,
}) {
  if (step === 'weight') {
    return (
      <fieldset>
        <legend>
          What was your weight this morning?
        </legend>

        <label>
          Morning weight
          <span>
            <input
              type="number"
              min="1"
              step="0.1"
              inputMode="decimal"
              value={form.morning_weight}
              disabled={form.weight_status !== 'recorded'}
              onChange={(event) =>
                setField(
                  'morning_weight',
                  event.target.value,
                )
              }
            />{' '}
            lbs
          </span>
        </label>

        <label>
          Weight status
          <select
            value={form.weight_status}
            onChange={(event) =>
              setField(
                'weight_status',
                event.target.value,
              )
            }
          >
            <option value="recorded">
              Weight recorded
            </option>

            <option value="traveling">
              Traveling
            </option>

            <option value="no_scale">
              No scale available
            </option>

            <option value="scale_issue">
              Scale issue
            </option>

            <option value="skipped">
              Skipped weighing
            </option>
          </select>
        </label>
      </fieldset>
    )
  }

  if (step === 'meal-plan') {
    const mealPlanScore = Number(
      form.meal_plan_score,
    )

    return (
      <fieldset>
        <legend>
          How closely did you follow your meal plan
          yesterday?
        </legend>

        <ChoiceList
          name="meal-plan-score"
          value={form.meal_plan_score}
          options={MEAL_PLAN_OPTIONS}
          onChange={(value) =>
            setField('meal_plan_score', value)
          }
        />

        {mealPlanScore >= 1 &&
          mealPlanScore <= 4 && (
            <label>
              What was different from your plan, and
              why?
              <textarea
                rows="5"
                value={
                  form.meal_plan_deviation_details
                }
                onChange={(event) =>
                  setField(
                    'meal_plan_deviation_details',
                    event.target.value,
                  )
                }
                placeholder="Include anything you added, skipped, substituted, ate in a different amount, or any planned meal you did not eat."
              />
            </label>
          )}

        <fieldset>
          <legend>
            Was one of your meals a planned cheat meal?
          </legend>

          <ChoiceList
            name="cheat-meal"
            value={form.planned_cheat_meal_status}
            options={CHEAT_MEAL_OPTIONS}
            onChange={(value) =>
              setField(
                'planned_cheat_meal_status',
                value,
              )
            }
          />
        </fieldset>
      </fieldset>
    )
  }

  if (step === 'hunger') {
    return (
      <fieldset>
        <legend>
          How hungry were you overall yesterday?
        </legend>

        <ChoiceList
          name="hunger-score"
          value={form.hunger_score}
          options={HUNGER_OPTIONS}
          onChange={(value) =>
            setField('hunger_score', value)
          }
        />
      </fieldset>
    )
  }

  if (step === 'water') {
    const waterGoal =
      target?.daily_water_goal_oz ?? 0

    return (
      <fieldset>
        <legend>
          Did you hit your water goal yesterday?
        </legend>

        <p>Your goal: {waterGoal} oz</p>

        <ChoiceList
          name="water-goal"
          value={form.water_goal_met}
          options={[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ]}
          onChange={(value) =>
            setField('water_goal_met', value)
          }
        />
      </fieldset>
    )
  }

  if (step === 'workout') {
    const workoutWasIncomplete = [
      'partial',
      'missed',
    ].includes(form.workout_status)

    const workoutWasAttempted = [
      'completed',
      'partial',
    ].includes(form.workout_status)

    return (
      <fieldset>
        <legend>
          Did you complete your scheduled workout
          yesterday?
        </legend>

        <ChoiceList
          name="workout-status"
          value={form.workout_status}
          options={WORKOUT_OPTIONS}
          onChange={(value) =>
            setField('workout_status', value)
          }
        />

        {workoutWasIncomplete && (
          <label>
            What prevented you from completing it?
            <textarea
              rows="4"
              value={form.workout_incomplete_reason}
              onChange={(event) =>
                setField(
                  'workout_incomplete_reason',
                  event.target.value,
                )
              }
            />
          </label>
        )}

        {workoutWasAttempted && (
          <fieldset>
            <legend>
              Did you have any pain, difficulty, or
              problems during training?
            </legend>

            <ChoiceList
              name="training-problem"
              value={form.training_problem}
              options={[
                { value: true, label: 'Yes' },
                { value: false, label: 'No' },
              ]}
              onChange={(value) =>
                setField('training_problem', value)
              }
            />

            {form.training_problem === true && (
              <label>
                Describe what happened.
                <textarea
                  rows="4"
                  value={
                    form.training_problem_details
                  }
                  onChange={(event) =>
                    setField(
                      'training_problem_details',
                      event.target.value,
                    )
                  }
                />
              </label>
            )}
          </fieldset>
        )}
      </fieldset>
    )
  }

  if (step === 'cardio') {
    const cardioTarget =
      target?.weekly_cardio_target_minutes ?? 0

    return (
      <fieldset>
        <legend>
          How many minutes of cardio did you complete
          yesterday?
        </legend>

        <p>
          This week: {cardioCompleted} / {cardioTarget}{' '}
          minutes
        </p>

        <label>
          Cardio completed yesterday
          <span>
            <input
              type="number"
              min="0"
              max="1440"
              step="1"
              inputMode="numeric"
              value={form.cardio_minutes}
              onChange={(event) =>
                setField(
                  'cardio_minutes',
                  event.target.value,
                )
              }
            />{' '}
            minutes
          </span>
        </label>
      </fieldset>
    )
  }

  if (step === 'alcohol') {
    return (
      <fieldset>
        <legend>
          Did you drink alcohol yesterday?
        </legend>

        <ChoiceList
          name="alcohol"
          value={form.alcohol_consumed}
          options={[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ]}
          onChange={(value) =>
            setField('alcohol_consumed', value)
          }
        />

        {form.alcohol_consumed === true && (
          <label>
            What did you drink, and how much?
            <textarea
              rows="4"
              value={form.alcohol_details}
              onChange={(event) =>
                setField(
                  'alcohol_details',
                  event.target.value,
                )
              }
              placeholder="Example: two 5 oz glasses of wine, three vodka shots, or two beers."
            />
          </label>
        )}
      </fieldset>
    )
  }

  if (step === 'additional-notes') {
    return (
      <label>
        Is there anything else you would like to share
        with your coach?
        <textarea
          rows="7"
          value={form.additional_notes}
          onChange={(event) =>
            setField(
              'additional_notes',
              event.target.value,
            )
          }
          placeholder="Poor sleep, unusual stress, illness, upcoming travel, a schedule change, a meal or workout concern, or anything else that may affect your plan."
        />
      </label>
    )
  }

  return (
    <label>
      Do you have any questions for your coach?
      <textarea
        rows="7"
        value={form.questions_for_coach}
        onChange={(event) =>
          setField(
            'questions_for_coach',
            event.target.value,
          )
        }
        placeholder="Enter any questions you would like your coach to review."
      />
    </label>
  )
}