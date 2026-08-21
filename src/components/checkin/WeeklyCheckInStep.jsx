import {
  DailyCheckInStep,
} from './DailyCheckInStep'
import {
  BodyFatQuestion,
} from './questions/BodyFatQuestion'
import {
  WizardNumberField,
  WizardQuestion,
  WizardSlider,
  WizardTextarea,
} from '../wizard'
import {
  WEEKLY_CHECKIN_STEP_IDS as STEP,
  fromWeeklyDailyStep,
} from '../../utils/weeklyCheckInFlow'
import {
  getMeasurementUnit,
} from '../../utils/measurementUnits'

const RECOVERY_QUESTIONS = [
  {
    field: 'sleep_quality',
    prompt:
      'How was your sleep overall this week?',
    labels: {
      1: 'Poor',
      2: 'Below average',
      3: 'Okay',
      4: 'Good',
      5: 'Excellent',
    },
  },
  {
    field: 'energy_level',
    prompt:
      'How was your energy overall this week?',
    labels: {
      1: 'Very low',
      2: 'Low',
      3: 'Moderate',
      4: 'Good',
      5: 'Excellent',
    },
  },
  {
    field: 'recovery_score',
    prompt:
      'How well did your body recover from training?',
    labels: {
      1: 'Poorly recovered',
      2: 'Still very sore',
      3: 'Managing',
      4: 'Well recovered',
      5: 'Fully recovered',
    },
  },
  {
    field: 'stress_level',
    prompt:
      'How manageable was your stress this week?',
    labels: {
      1: 'Overwhelming',
      2: 'Difficult',
      3: 'Manageable',
      4: 'Mostly manageable',
      5: 'Very manageable',
    },
  },
]

const MEASUREMENT_CONFIG = {
  [STEP.NECK]: {
    title: 'Measure your neck.',
    label: 'Neck',
    formField: 'neck_inches',
    validationField: 'neck_inches',
    inputId: 'weekly-neck',
    tip:
      'Look straight ahead and relax your shoulders. ' +
      'Measure around the middle of your neck, just ' +
      'below the larynx. Keep the tape level.',
  },
  [STEP.CHEST]: {
    title: 'Measure your chest.',
    label: 'Chest',
    formField: 'chest_inches',
    validationField: 'chest_inches',
    inputId: 'weekly-chest',
    tip:
      'Stand tall and relaxed with your feet together. ' +
      'Measure around the fullest part of your chest ' +
      'or bust. Keep the tape level and breathe normally.',
  },
  [STEP.WAIST]: {
    title: 'Measure your waist.',
    label: 'Waist',
    formField: 'waist_inches',
    validationField: 'waist_inches',
    inputId: 'weekly-waist',
    tip:
      'Measure horizontally around your waist at the ' +
      'level of your belly button. Stand naturally and ' +
      'breathe normally. Keep the tape flat and snug ' +
      'without pinching or indenting your skin.',
  },
  [STEP.HIPS]: {
    title: 'Measure your hips.',
    label: 'Hips',
    formField: 'hips_inches',
    validationField: 'hips_inches',
    inputId: 'weekly-hips',
    tip:
      'Stand with your feet together. Measure around ' +
      'the widest part of your hips and glutes, keeping ' +
      'the tape flat and level.',
  },
}

function MeasurementField({
  id,
  label,
  formField,
  validationField,
  value,
  unitSystem,
  validation,
  helper,
  onChange,
}) {
  return (
    <WizardNumberField
      id={id}
      className="weekly-measurement-field"
      label={label}
      value={value}
      suffix={getMeasurementUnit(
        validationField,
        unitSystem,
      )}
      min="0.1"
      step="0.1"
      maxDecimalPlaces={1}
      helper={helper}
      feedback={validation?.message}
      state={validation?.displayState}
      onBlur={() => {
        if (
          value !== '' &&
          Number.isFinite(Number(value))
        ) {
          onChange(
            Number(value).toString(),
          )
        }
      }}
      onChange={onChange}
      name={formField}
    />
  )
}

function RecoveryStep({
  form,
  setField,
}) {
  return (
    <WizardQuestion
      title="Recovery & Context"
      helper="Slide right when things were going well. Complete all four so your coach can interpret this week in context."
    >
      <div className="weekly-recovery-list">
        {RECOVERY_QUESTIONS.map(
          ({
            field,
            prompt,
            labels,
          }) => (
            <section key={field}>
              <h2>{prompt}</h2>

              <WizardSlider
                name={field}
                value={form[field]}
                labels={labels}
                onChange={(value) =>
                  setField(field, value)
                }
              />
            </section>
          ),
        )}
      </div>
    </WizardQuestion>
  )
}

function SingleMeasurementStep({
  step,
  form,
  setField,
  unitSystem,
  validationByField,
}) {
  const config =
    MEASUREMENT_CONFIG[step]

  return (
    <WizardQuestion
      title={config.title}
      helper={config.tip}
    >
      <MeasurementField
        id={config.inputId}
        label={config.label}
        formField={config.formField}
        validationField={
          config.validationField
        }
        value={form[config.formField]}
        unitSystem={unitSystem}
        validation={
          validationByField[
            config.formField
          ]
        }
        onChange={(value) =>
          setField(
            config.formField,
            value,
          )
        }
      />
    </WizardQuestion>
  )
}

function SideMeasurementsStep({
  form,
  setField,
  measurementSide,
  unitSystem,
  validationByField,
}) {
  const sideLabel =
    measurementSide === 'left'
      ? 'Left'
      : 'Right'

  return (
    <WizardQuestion
      title={`Measure your ${sideLabel.toUpperCase()} side.`}
      helper={
        <>
          Use the same saved side and landmarks from
          Start Day. Keep each muscle relaxed and the
          tape flat and snug.
        </>
      }
    >
      <div className="weekly-side-measurements">
        <MeasurementField
          id="weekly-bicep"
          label={`${sideLabel} Bicep`}
          formField="bicep_inches"
          validationField="upper_arm_inches"
          value={form.bicep_inches}
          unitSystem={unitSystem}
          validation={
            validationByField.bicep_inches
          }
          helper="Let your arm hang relaxed. Measure halfway between your shoulder and elbow. Do not flex."
          onChange={(value) =>
            setField(
              'bicep_inches',
              value,
            )
          }
        />

        <MeasurementField
          id="weekly-thigh"
          label={`${sideLabel} Thigh`}
          formField="thigh_inches"
          validationField="thigh_inches"
          value={form.thigh_inches}
          unitSystem={unitSystem}
          validation={
            validationByField.thigh_inches
          }
          helper="Stand with your leg relaxed. Measure around the widest part of your upper leg, usually just below the glutes."
          onChange={(value) =>
            setField(
              'thigh_inches',
              value,
            )
          }
        />

        <MeasurementField
          id="weekly-calf"
          label={`${sideLabel} Calf`}
          formField="calf_inches"
          validationField="calf_inches"
          value={form.calf_inches}
          unitSystem={unitSystem}
          validation={
            validationByField.calf_inches
          }
          helper="Stand with your leg relaxed. Measure around the widest part of your calf."
          onChange={(value) =>
            setField(
              'calf_inches',
              value,
            )
          }
        />
      </div>
    </WizardQuestion>
  )
}

function BodyFatStep({
  form,
  setField,
  validationByField,
  onSkipBodyFat,
}) {
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
          .scale_body_fat_percent
          ?.displayState
      }
      onValueChange={(value) => {
        setField(
          'scale_body_fat_percent',
          value,
        )
        setField(
          'body_fat_status',
          value === ''
            ? ''
            : 'recorded',
        )
      }}
      onUnavailableChange={
        (unavailable) => {
          setField(
            'body_fat_status',
            unavailable
              ? 'no_reading'
              : '',
          )

          if (unavailable) {
            setField(
              'scale_body_fat_percent',
              '',
            )
          }
        }
      }
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

function PhotoTipsStep({
  measurementSide,
}) {
  const sideLabel =
    measurementSide === 'left'
      ? 'left'
      : 'right'

  return (
    <WizardQuestion title="Pro-Tips for Progress Photos">
      <div className="weekly-photo-tips">
        <p>
          <strong>
            Wear the same or similarly fitted clothing:
          </strong>{' '}
          This makes changes easier to compare.
        </p>

        <p>
          <strong>
            Use consistent lighting and framing:
          </strong>{' '}
          Choose a plain background and keep your
          entire body visible from head to feet.
        </p>

        <p>
          <strong>
            Keep the camera position consistent:
          </strong>{' '}
          Use the same camera height, distance, and
          location whenever possible.
        </p>

        <p>
          <strong>Stand naturally:</strong>{' '}
          Relax your shoulders, keep your arms at
          your sides, and do not flex or suck in.
        </p>

        <p>
          <strong>Your side photo:</strong>{' '}
          Use your {sideLabel} side—the same saved
          side used for measurements.
        </p>
      </div>
    </WizardQuestion>
  )
}

function PhotoQuestion({
  pose,
  title,
  helper,
  photo,
  uploadPhoto,
  uploading,
  persistenceEnabled,
}) {
  const inputId =
    `weekly-${pose}-photo`

  async function handleChange(event) {
    const file =
      event.target.files?.[0]

    if (file) {
      await uploadPhoto(pose, file)
    }

    event.target.value = ''
  }

  const imageUrl =
    photo?.signed_url ??
    photo?.preview_url

  return (
    <WizardQuestion
      title={title}
      helper={helper}
    >
      <p className="weekly-preview-note">
        {persistenceEnabled
          ? 'Optional — add a photo now or tap Next to skip. If you add one, it saves immediately and will still be here if you Exit Check-In.'
          : 'Optional — add a photo or tap Next to skip. DEV preview photos are not uploaded or saved.'}
      </p>

      <label
        className={`weekly-photo-card ${
          photo ? 'has-answer' : ''
        }`}
        htmlFor={inputId}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${pose} Weekly Check-In`}
          />
        ) : (
          <span className="weekly-photo-placeholder">
            {uploading
              ? 'Saving photo...'
              : 'Tap to take or choose a photo'}
          </span>
        )}

        <span className="weekly-photo-action">
          {uploading
            ? 'Saving...'
            : photo
              ? 'Replace Photo'
              : 'Add Photo'}
        </span>
      </label>

      <input
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        disabled={uploading}
        onChange={handleChange}
      />
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
  uploadPhoto,
  uploadingPose,
  persistenceEnabled,
  onSkipBodyFat,
  unitSystem,
  validationByField = {},
  checkInDate = null,
  isHistorical = false,
}) {
  if (step === STEP.GET_STARTED) {
    return (
      <WizardQuestion title="Let’s Get Started">
        <p className="weekly-prep-intro">
          Before you begin, have these ready:
        </p>

        <div className="weekly-prep-list">
          <div>
            <span aria-hidden="true">✓</span>
            <p>
              <strong>A scale</strong>
              <small>
                Use the same scale whenever possible.
              </small>
            </p>
          </div>

          <div>
            <span aria-hidden="true">✓</span>
            <p>
              <strong>
                A flexible body-measuring tape
              </strong>
              <small>
                Use a non-stretch tape made for body
                measurements.
              </small>
            </p>
          </div>

          <div>
            <span aria-hidden="true">✓</span>
            <p>
              <strong>Your phone or camera</strong>
              <small>
                You may need progress photos during
                this Weekly Check-In.
              </small>
            </p>
          </div>
        </div>

        <p className="weekly-prep-note">
          For the most consistent comparison, complete
          your check-in under similar conditions each
          week. On progress-photo weeks, keep the same
          or a similar fitted outfit available.
        </p>
      </WizardQuestion>
    )
  }

  const dailyStep =
    fromWeeklyDailyStep(step)

  if (dailyStep) {
    return (
      <DailyCheckInStep
        step={dailyStep}
        form={form}
        setField={setField}
        target={target}
        cardioCompleted={
          cardioCompleted
        }
        validationByField={
          validationByField
        }
        checkInDate={checkInDate}
        isHistorical={isHistorical}
      />
    )
  }

  if (step === STEP.BODY_FAT) {
    return (
      <BodyFatStep
        form={form}
        setField={setField}
        onSkipBodyFat={onSkipBodyFat}
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

  if (
    [
      STEP.NECK,
      STEP.CHEST,
      STEP.WAIST,
      STEP.HIPS,
    ].includes(step)
  ) {
    return (
      <SingleMeasurementStep
        step={step}
        form={form}
        setField={setField}
        unitSystem={unitSystem}
        validationByField={
          validationByField
        }
      />
    )
  }

  if (
    step === STEP.SIDE_MEASUREMENTS
  ) {
    return (
      <SideMeasurementsStep
        form={form}
        setField={setField}
        measurementSide={
          plan?.measurement_side ??
          plan?.side_choice
        }
        unitSystem={unitSystem}
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

  if (step === STEP.PHOTO_TIPS) {
    return (
      <PhotoTipsStep
        measurementSide={
          plan?.measurement_side ??
          plan?.side_choice
        }
      />
    )
  }

  if (step === STEP.FRONT_PHOTO) {
    return (
      <PhotoQuestion
        pose="front"
        title="Add your FRONT progress photo."
        helper="Stand naturally facing the camera with your body relaxed and your arms resting at your sides. Keep your full body visible from head to feet."
        photo={photos.front}
        uploadPhoto={uploadPhoto}
        uploading={
          uploadingPose === 'front'
        }
        persistenceEnabled={
          persistenceEnabled
        }
      />
    )
  }

  if (step === STEP.SIDE_PHOTO) {
    const side =
      plan?.measurement_side ??
      plan?.side_choice ??
      'chosen'

    return (
      <PhotoQuestion
        pose="side"
        title={`Add your ${side.toUpperCase()} SIDE progress photo.`}
        helper={`Stand naturally with your ${side} side facing the camera, your body relaxed, and your arms resting at your sides. Keep your full body visible from head to feet.`}
        photo={photos.side}
        uploadPhoto={uploadPhoto}
        uploading={
          uploadingPose === 'side'
        }
        persistenceEnabled={
          persistenceEnabled
        }
      />
    )
  }

  if (step === STEP.BACK_PHOTO) {
    return (
      <PhotoQuestion
        pose="back"
        title="Add your BACK progress photo."
        helper="Stand naturally facing away from the camera with your body relaxed and your arms resting at your sides. Keep your full body visible from head to feet."
        photo={photos.back}
        uploadPhoto={uploadPhoto}
        uploading={
          uploadingPose === 'back'
        }
        persistenceEnabled={
          persistenceEnabled
        }
      />
    )
  }

  return (
    <WizardQuestion
      title="How do you feel this week went? Include anything you’d like your coach to know or any questions you have."
      helper="Optional — leave blank and tap Review Answers."
    >
      <WizardTextarea
        id="weekly-reflection"
        ariaLabel="Weekly reflection, coach notes, and questions"
        value={form.weekly_reflection}
        onChange={(value) =>
          setField(
            'weekly_reflection',
            value,
          )
        }
        placeholder="Share your wins, challenges, schedule changes, concerns, questions, or anything else that would help your coach understand the week."
        optional
        promptWhenEmpty
      />
    </WizardQuestion>
  )
}
