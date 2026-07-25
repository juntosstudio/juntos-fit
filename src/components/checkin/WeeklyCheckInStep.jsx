import { DailyCheckInStep } from './DailyCheckInStep'
import {
  BodyFatQuestion,
} from './questions/BodyFatQuestion'
import {
  WizardNumberField,
  WizardQuestion,
  WizardTextarea,
} from '../wizard'
import {
  WEEKLY_CHECKIN_STEP_IDS as STEP,
  fromWeeklyDailyStep,
} from '../../utils/weeklyCheckInFlow'

function ScoreButtons({
  name,
  value,
  onChange,
}) {
  return (
    <div
      className="weekly-score-buttons"
      role="radiogroup"
      aria-label={name}
    >
      {[1, 2, 3, 4, 5].map((score) => (
        <label key={score}>
          <input
            type="radio"
            name={name}
            value={score}
            checked={
              Number(value) === score
            }
            onChange={() =>
              onChange(String(score))
            }
          />
          <span>{score}</span>
        </label>
      ))}
    </div>
  )
}

function MeasurementField({
  id,
  label,
  value,
  validation,
  onChange,
}) {
  return (
    <WizardNumberField
      id={id}
      label={label}
      value={value}
      suffix="in"
      min="0.1"
      step="0.1"
      maxDecimalPlaces={1}
      feedback={validation?.message}
      state={validation?.displayState}
      onChange={onChange}
    />
  )
}

function RecoveryStep({ form, setField }) {
  const questions = [
    {
      field: 'sleep_quality',
      prompt:
        'How was your sleep overall this week?',
      low: 'Poor',
      high: 'Excellent',
    },
    {
      field: 'energy_level',
      prompt:
        'How was your energy overall this week?',
      low: 'Very low',
      high: 'Excellent',
    },
    {
      field: 'recovery_score',
      prompt:
        'How well did your body recover from training?',
      low: 'Poorly',
      high: 'Very well',
    },
    {
      field: 'stress_level',
      prompt:
        'How high was your stress this week?',
      low: 'Very low',
      high: 'Very high',
    },
  ]

  return (
    <WizardQuestion
      title="Recovery & Context"
      helper="This helps Juntos Fit understand whether changes may be related to nutrition, sleep, stress, or training recovery."
    >
      <div className="weekly-recovery-list">
        {questions.map(
          ({
            field,
            prompt,
            low,
            high,
          }) => (
            <section key={field}>
              <h2>{prompt}</h2>

              <ScoreButtons
                name={field}
                value={form[field]}
                onChange={(value) =>
                  setField(field, value)
                }
              />

              <div className="weekly-score-labels">
                <span>{low}</span>
                <span>{high}</span>
              </div>
            </section>
          ),
        )}
      </div>
    </WizardQuestion>
  )
}

function MeasurementsStep({
  form,
  setField,
  measurementSide,
  validationByField,
}) {
  const sideLabel =
    measurementSide === 'left'
      ? 'Left'
      : 'Right'

  return (
    <WizardQuestion
      title="Weekly Measurements"
      helper={
        <>
          Repeat the same measurements and
          landmarks used for your Start Day
          Check-In. Your saved side is{' '}
          <strong>{sideLabel}</strong>.
        </>
      }
    >
      <details className="weekly-measurement-tips">
        <summary>
          Pro-Tips for Accuracy
        </summary>

        <p>
          Take measurements first thing in the
          morning, after using the restroom, and
          before eating or drinking. Use the same
          landmarks and saved side. Stand
          naturally, and keep the tape flat,
          level, and snug without flexing or
          sucking in.
        </p>
      </details>

      <div className="weekly-measurement-grid">
        <MeasurementField
          id="weekly-neck"
          validation={
            validationByField.neck_inches
          }
          label="Neck"
          value={form.neck_inches}
          onChange={(value) =>
            setField('neck_inches', value)
          }
        />

        <MeasurementField
          id="weekly-waist"
          validation={
            validationByField.waist_inches
          }
          label="Waist"
          value={form.waist_inches}
          onChange={(value) =>
            setField('waist_inches', value)
          }
        />

        <MeasurementField
          id="weekly-hips"
          validation={
            validationByField.hips_inches
          }
          label="Hips"
          value={form.hips_inches}
          onChange={(value) =>
            setField('hips_inches', value)
          }
        />

        <MeasurementField
          id="weekly-bicep"
          validation={
            validationByField.bicep_inches
          }
          label={`${sideLabel} Bicep`}
          value={form.bicep_inches}
          onChange={(value) =>
            setField('bicep_inches', value)
          }
        />

        <MeasurementField
          id="weekly-thigh"
          validation={
            validationByField.thigh_inches
          }
          label={`${sideLabel} Thigh`}
          value={form.thigh_inches}
          onChange={(value) =>
            setField('thigh_inches', value)
          }
        />

        <MeasurementField
          id="weekly-calf"
          validation={
            validationByField.calf_inches
          }
          label={`${sideLabel} Calf`}
          value={form.calf_inches}
          onChange={(value) =>
            setField('calf_inches', value)
          }
        />
      </div>

    </WizardQuestion>
  )
}

function BodyFatStep({
  form,
  setField,
  bodyFatSource,
  validationByField,
  onSkipBodyFat,
}) {
  if (
    bodyFatSource === 'juntos_estimate'
  ) {
    return (
      <WizardQuestion
        title="Body Fat Estimate"
        helper="The calculation will be connected after we finalize and validate the estimation method."
      >
        <p>
          Juntos Fit will estimate your body-fat
          trend using this week’s measurements.
        </p>
      </WizardQuestion>
    )
  }

  return (
    <BodyFatQuestion
      id="weekly-scale-body-fat"
      value={
        form.scale_body_fat_percent
      }
      unavailable={
        form.body_fat_status ===
        'no_reading'
      }
      feedback={
        validationByField
          .scale_body_fat_percent?.message
      }
      state={
        validationByField
          .scale_body_fat_percent?.displayState
      }
      onValueChange={(value) => {
        setField(
          'scale_body_fat_percent',
          value,
        )
        setField(
          'body_fat_status',
          value === '' ? '' : 'recorded',
        )
      }}
      onUnavailableChange={(unavailable) => {
        setField(
          'body_fat_status',
          unavailable ? 'no_reading' : '',
        )

        if (unavailable) {
          setField(
            'scale_body_fat_percent',
            '',
          )
        }
      }}
      onSkip={onSkipBodyFat}
    />
  )
}

function MenstrualContextStep({
  form,
  setField,
}) {
  return (
    <WizardQuestion
      title="Menstrual Cycle Context"
      helper="Optional — leave blank and tap Next."
    >
      <WizardTextarea
        id="weekly-menstrual-cycle-context"
        ariaLabel="Menstrual cycle context"
        value={
          form.menstrual_cycle_context
        }
        onChange={(value) =>
          setField(
            'menstrual_cycle_context',
            value,
          )
        }
        placeholder="For example: your period started, is expected soon, or you noticed unusual bloating, hunger, fatigue, or symptoms."
        optional
      />
    </WizardQuestion>
  )
}

function PhotoCard({
  pose,
  label,
  photo,
  onSelect,
}) {
  return (
    <article className="weekly-photo-card">
      <h2>{label}</h2>

      {photo?.preview_url ? (
        <img
          src={photo.preview_url}
          alt={`${label} preview`}
        />
      ) : (
        <div className="weekly-photo-placeholder">
          No photo selected
        </div>
      )}

      <label className="weekly-photo-picker">
        <span>
          {photo
            ? 'Choose a different photo'
            : 'Choose photo'}
        </span>

        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file =
              event.target.files?.[0]

            if (file) {
              onSelect(pose, file)
            }

            event.target.value = ''
          }}
        />
      </label>
    </article>
  )
}

function PhotosStep({
  photos,
  addPreviewPhoto,
  measurementSide,
}) {
  const sideLabel =
    measurementSide === 'left'
      ? 'Left'
      : 'Right'

  return (
    <WizardQuestion
      title="Progress Photos"
      helper="Photos are due every four weeks and on the final plan check-in. Use the same framing, lighting, and saved side as Start Day."
    >
      <p className="weekly-preview-note">
        DEV preview: selecting a photo shows it
        only on this screen. Nothing is uploaded
        or saved.
      </p>

      <div className="weekly-photo-grid">
        <PhotoCard
          pose="front"
          label="Front"
          photo={photos.front}
          onSelect={addPreviewPhoto}
        />

        <PhotoCard
          pose="side"
          label={`Side (${sideLabel})`}
          photo={photos.side}
          onSelect={addPreviewPhoto}
        />

        <PhotoCard
          pose="back"
          label="Back"
          photo={photos.back}
          onSelect={addPreviewPhoto}
        />
      </div>
    </WizardQuestion>
  )
}

export function WeeklyCheckInStep({
  step,
  form,
  setField,
  target,
  cardioCompleted,
  plan,
  photos,
  addPreviewPhoto,
  onSkipBodyFat,
  validationByField = {},
}) {
  const dailyStep =
    fromWeeklyDailyStep(step)

  if (dailyStep) {
    return (
      <DailyCheckInStep
        step={dailyStep}
        form={form}
        setField={setField}
        target={target}
        cardioCompleted={cardioCompleted}
        validationByField={
          validationByField
        }
      />
    )
  }

  if (step === STEP.RECOVERY) {
    return (
      <RecoveryStep
        form={form}
        setField={setField}
      />
    )
  }

  if (step === STEP.MEASUREMENTS) {
    return (
      <MeasurementsStep
        form={form}
        setField={setField}
        measurementSide={
          plan?.measurement_side
        }
        validationByField={
          validationByField
        }
      />
    )
  }

  if (step === STEP.BODY_FAT) {
    return (
      <BodyFatStep
        form={form}
        setField={setField}
        bodyFatSource={
          plan?.body_fat_source
        }
        onSkipBodyFat={onSkipBodyFat}
        validationByField={
          validationByField
        }
      />
    )
  }

  if (
    step === STEP.MENSTRUAL_CONTEXT
  ) {
    return (
      <MenstrualContextStep
        form={form}
        setField={setField}
      />
    )
  }

  if (step === STEP.PHOTOS) {
    return (
      <PhotosStep
        photos={photos}
        addPreviewPhoto={addPreviewPhoto}
        measurementSide={
          plan?.measurement_side
        }
      />
    )
  }

  return (
    <WizardQuestion
      title="Weekly Reflection"
      helper="Optional — leave blank and tap Next."
    >
      <WizardTextarea
        id="weekly-reflection"
        ariaLabel="Weekly reflection"
        value={form.weekly_reflection}
        onChange={(value) =>
          setField(
            'weekly_reflection',
            value,
          )
        }
        placeholder="Wins, challenges, schedule changes, digestion, soreness, or anything else your coach should understand about this week."
        optional
      />
    </WizardQuestion>
  )
}
