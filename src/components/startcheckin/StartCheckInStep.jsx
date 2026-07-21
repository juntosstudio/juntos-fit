import { ChoiceButtons } from '../checkin/QuestionControls'
import {
  SIDE_OPTIONS,
  START_CHECKIN_STEP_IDS as STEP,
} from '../../utils/startCheckInFlow'
import { getMeasurementUnit } from '../../utils/measurementUnits'

const MEASUREMENT_CONFIG = {
  [STEP.NECK]: {
    legend: 'Measure your neck.',
    label: 'Neck',
    field: 'neck_inches',
    tip:
      'Look straight ahead and relax your shoulders. ' +
      'Measure around the middle of your neck, just ' +
      'below the larynx. Keep the tape level.',
  },
  [STEP.CHEST]: {
    legend: 'Measure your chest.',
    label: 'Chest',
    field: 'chest_inches',
    tip:
      'Stand tall and relaxed with your feet together. ' +
      'Measure around the fullest part of your chest ' +
      'or bust. Keep the tape level and breathe normally.',
  },
  [STEP.WAIST]: {
    legend: 'Measure your waist.',
    label: 'Waist',
    field: 'waist_inches',
    tip:
      'Measure horizontally around your waist at the ' +
      'level of your belly button. Stand naturally and ' +
      'breathe normally. Keep the tape flat and snug ' +
      'without pinching or indenting your skin.',
  },
  [STEP.HIPS]: {
    legend: 'Measure your hips.',
    label: 'Hips',
    field: 'hips_inches',
    tip:
      'Stand with your feet together. It may be easier ' +
      'to stand sideways in front of a mirror so you ' +
      'can find the widest point. Measure around the ' +
      'widest part of your hips and glutes.',
  },
}

function getFieldClass(
  value,
  validation,
  touched,
  optional,
) {
  if (optional && value === '') {
    return 'is-optional'
  }

  if (value === '') {
    return 'needs-answer'
  }

  if (validation?.status === 'invalid') {
    return 'is-invalid'
  }

  if (validation?.status === 'warning') {
    return 'is-warning'
  }

  return 'has-answer'
}

function MeasurementField({
  label,
  field,
  value,
  setField,
  unitSystem,
  validation,
  touched,
  markFieldTouched,
  tip = '',
  optional = false,
  disabled = false,
}) {
  const suffix = getMeasurementUnit(
    field,
    unitSystem,
  )
  const showFeedback =
    value !== '' &&
    ['invalid', 'warning'].includes(
      validation?.status,
    )
  return (
    <label className="start-measurement-field">
      <span>{label}</span>

      {tip && (
        <small className="measurement-tip">
          {tip}
        </small>
      )}

      <div className="number-answer">
        <input
          id={`start-measurement-${field}`}
          data-measurement-field={field}
          className={`interaction-field ${getFieldClass(
            value,
            validation,
            touched,
            optional,
          )}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={value}
          disabled={disabled}
          aria-invalid={
            validation?.status === 'invalid'
          }
          onBlur={() =>
            markFieldTouched(field)
          }
          onChange={(event) =>
            setField(field, event.target.value)
          }
        />

        <span>{suffix}</span>
      </div>

      {showFeedback && (
        <p
          className={`measurement-feedback ${validation.status}`}
          role={
            validation.status === 'invalid'
              ? 'alert'
              : 'status'
          }
        >
          {validation.message}
        </p>
      )}
    </label>
  )
}

function PhotoField({
  pose,
  title,
  helper,
  photo,
  uploadingPose,
  uploadPhoto,
  disabled,
}) {
  const inputId = `start-${pose}-photo`
  const isUploading = uploadingPose === pose

  async function handleChange(event) {
    const file = event.target.files?.[0]

    if (file) {
      await uploadPhoto(pose, file)
    }

    event.target.value = ''
  }

  return (
    <fieldset>
      <legend>{title}</legend>
      <p className="question-helper">{helper}</p>

      <label
        className={`start-photo-card ${
          photo ? 'has-answer' : 'needs-answer'
        }`}
        htmlFor={inputId}
      >
        {photo?.signed_url ? (
          <img
            src={photo.signed_url}
            alt={`${pose} Start Check-In preview`}
          />
        ) : (
          <span className="start-photo-placeholder">
            {disabled
              ? 'Photo changes are unavailable.'
              : 'Tap to take or choose a photo'}
          </span>
        )}

        <span className="start-photo-action">
          {isUploading
            ? 'Uploading...'
            : disabled
              ? 'Photo Saved'
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
        capture="environment"
        disabled={disabled || isUploading}
        onChange={handleChange}
      />
    </fieldset>
  )
}

// Displays one Start Check-In wizard question.
export function StartCheckInStep({
  step,
  plan,
  form,
  photos,
  estimatedBodyFat,
  unitSystem,
  validationByField,
  touchedFields,
  markFieldTouched,
  setField,
  uploadPhoto,
  uploadingPose,
  previewing,
  readOnly,
  sideLocked,
}) {
  const inputsDisabled =
    previewing || readOnly

  if (step === STEP.TIPS) {
    return (
      <fieldset>
        <legend>Pro-Tips for Accuracy</legend>

        <div className="measurement-tips">
          <p>
            <strong>Before you begin:</strong> Have a flexible measuring
            tape and be prepared to take or upload three
            full-body progress photos: front,
            side, and back.
          </p>
          <p>
            <strong>Consistency is key:</strong>{' '}
            Take measurements first thing in the
            morning, after using the restroom, and
            before eating or drinking. Use the same
            side and the same location on your body
            every time. Using
            a full-length mirror can be helpful.
          </p>

            <p>
            <strong>Photos tips:</strong> For the clearest comparison, wear the same or
            similarly fitted clothing each time. Use good
            lighting, a plain background, and keep your
            entire body visible from head to feet. Try to
            use the same camera height, distance, and
            position for future photos.</p>
            
            <p>
            <strong>And relax:</strong> Stand naturally, relax your shoulders, and keep the tape measure
            flat and parallel to the floor without
            sucking in or flexing your muscles. 
          </p>
        </div>
      </fieldset>
    )
  }

  if (step === STEP.WEIGHT) {
    return (
      <fieldset>
        <legend>What is your starting weight?</legend>

        <MeasurementField
          label="Starting weight"
          field="starting_weight_lbs"
          value={form.starting_weight_lbs}
          unitSystem={unitSystem}
          validation={
            validationByField.starting_weight_lbs
          }
          touched={
            touchedFields.starting_weight_lbs
          }
          markFieldTouched={markFieldTouched}
          tip="Use the same scale and similar conditions for future check-ins."
          setField={setField}
          disabled={inputsDisabled}
        />
      </fieldset>
    )
  }

  if (step === STEP.BODY_FAT) {
    if (
      plan.body_fat_source ===
      'juntos_estimate'
    ) {
      return (
        <fieldset>
          <legend>
            Your estimated starting body fat
          </legend>

          <p className="question-helper">
            Juntos Fit uses your profile and starting
            weight to calculate this estimate.
          </p>

          <div className="body-fat-estimate">
            <strong>
              {estimatedBodyFat
                ? `${estimatedBodyFat.percent.toFixed(
                    1,
                  )}%`
                : 'Estimate unavailable'}
            </strong>

            <span>Juntos Fit estimate</span>
          </div>
        </fieldset>
      )
    }

    return (
      <fieldset disabled={readOnly}>
        <legend>
          What body-fat percentage does your scale show?
        </legend>

        <p className="question-helper">
          Use the same scale throughout this plan.
        </p>

        <MeasurementField
          label="Scale body fat"
          field="body_fat_percent"
          value={form.body_fat_percent}
          unitSystem={unitSystem}
          validation={
            validationByField.body_fat_percent
          }
          touched={
            touchedFields.body_fat_percent
          }
          markFieldTouched={markFieldTouched}
          optional={form.body_fat_unavailable}
          disabled={
            inputsDisabled ||
            form.body_fat_unavailable
          }
          setField={setField}
        />

        <label className="body-fat-unavailable">
          <input
            type="checkbox"
            checked={form.body_fat_unavailable}
            disabled={inputsDisabled}
            onChange={(event) =>
              setField(
                'body_fat_unavailable',
                event.target.checked,
              )
            }
          />

          <span>
            I don’t have a body-fat reading today.
          </span>
        </label>
      </fieldset>
    )
  }

  const measurement =
    MEASUREMENT_CONFIG[step]

  if (measurement) {
    return (
      <fieldset>
        <legend>{measurement.legend}</legend>

        <MeasurementField
          label={measurement.label}
          field={measurement.field}
          value={form[measurement.field]}
          unitSystem={unitSystem}
          validation={
            validationByField[measurement.field]
          }
          touched={
            touchedFields[measurement.field]
          }
          markFieldTouched={markFieldTouched}
          tip={measurement.tip}
          setField={setField}
          disabled={inputsDisabled}
        />
      </fieldset>
    )
  }

  if (step === STEP.SIDE) {
    if (sideLocked) {
      return (
        <fieldset>
          <legend>Your measurement side</legend>

          <p className="locked-side-value">
            {form.measurement_side === 'left'
              ? 'Left Side'
              : 'Right Side'}
          </p>

          <p className="question-helper">
            This side is locked for the completed plan.
          </p>
        </fieldset>
      )
    }

    return (
      <fieldset disabled={inputsDisabled}>
        <legend>
          Which side will you track?
        </legend>

        <p className="question-helper">
          Choose the side you will measure throughout
          this plan. We recommend using your dominant
          side.
        </p>

        <div
          className={`start-choice-group ${
            form.measurement_side
              ? 'has-answer'
              : 'needs-answer'
          }`}
        >
          <ChoiceButtons
            name="measurement-side"
            value={form.measurement_side}
            options={SIDE_OPTIONS}
            onChange={(value) =>
              setField('measurement_side', value)
            }
          />
        </div>
      </fieldset>
    )
  }

  if (step === STEP.SIDE_MEASUREMENTS) {
    const side =
      form.measurement_side === 'left'
        ? 'Left'
        : 'Right'

    return (
      <fieldset>
        <legend>
          Measure your {side.toLowerCase()} side.
        </legend>

        <div className="start-side-measurements">
          <MeasurementField
            label={`${side} Upper Arm`}
            field="upper_arm_inches"
            value={form.upper_arm_inches}
            unitSystem={unitSystem}
            validation={
              validationByField.upper_arm_inches
            }
            touched={
              touchedFields.upper_arm_inches
            }
            markFieldTouched={markFieldTouched}
            tip={
              'Let your arm hang relaxed at your side. ' +
              'Measure around your upper arm about ' +
              'halfway between your shoulder and elbow. ' +
              'Do not flex.'
            }
            setField={setField}
            disabled={inputsDisabled}
          />

          <MeasurementField
            label={`${side} Thigh`}
            field="thigh_inches"
            value={form.thigh_inches}
            unitSystem={unitSystem}
            validation={
              validationByField.thigh_inches
            }
            touched={
              touchedFields.thigh_inches
            }
            markFieldTouched={markFieldTouched}
            tip={
              'Stand tall with your leg relaxed. ' +
              'Measure around the widest part of your ' +
              'upper leg, usually just below the glutes.'
            }
            setField={setField}
            disabled={inputsDisabled}
          />

          <MeasurementField
            label={`${side} Calf`}
            field="calf_inches"
            value={form.calf_inches}
            unitSystem={unitSystem}
            validation={
              validationByField.calf_inches
            }
            touched={
              touchedFields.calf_inches
            }
            markFieldTouched={markFieldTouched}
            tip={
              'Stand tall with your leg relaxed. ' +
              'Measure around the widest part of your calf.'
            }
            setField={setField}
            disabled={inputsDisabled}
          />
        </div>
      </fieldset>
    )
  }

  if (step === STEP.FRONT_PHOTO) {
    return (
      <PhotoField
        pose="front"
        title="Add your front progress photo."
        helper="Stand naturally facing the camera with your body relaxed and your arms resting at your sides. Keep your full body visible from head to feet."
        photo={photos.front}
        uploadingPose={uploadingPose}
        uploadPhoto={uploadPhoto}
        disabled={inputsDisabled}
      />
    )
  }

  if (step === STEP.SIDE_PHOTO) {
    const side =
      form.measurement_side || 'chosen'

    return (
      <PhotoField
        pose="side"
        title={`Add your ${side} side progress photo.`}
        helper={`Stand naturally with your ${side} side facing the camera, your body relaxed, and your arms resting at your sides. Keep your full body visible from head to feet.`}
        photo={photos.side}
        uploadingPose={uploadingPose}
        uploadPhoto={uploadPhoto}
        disabled={inputsDisabled}
      />
    )
  }

  return (
    <PhotoField
      pose="back"
      title="Add your back progress photo."
      helper="Stand naturally facing away from the camera with your body relaxed and your arms resting at your sides. Keep your full body visible from head to feet."
      photo={photos.back}
      uploadingPose={uploadingPose}
      uploadPhoto={uploadPhoto}
      disabled={inputsDisabled}
    />
  )
}
