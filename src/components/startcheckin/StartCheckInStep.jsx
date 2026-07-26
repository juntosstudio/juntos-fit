import { ChoiceButtons } from '../checkin/QuestionControls'
import {
  BodyFatQuestion,
} from '../checkin/questions/BodyFatQuestion'
import {
  WeightQuestion,
} from '../checkin/questions/WeightQuestion'
import {
  SIDE_OPTIONS,
  START_CHECKIN_STEP_IDS as STEP,
} from '../../utils/startCheckInFlow'
import {
  getMeasurementUnit,
} from '../../utils/measurementUnits'
import '../../styles/startCheckInTidy.css'

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

// Removes trailing zeroes only from locked saved values.
// Editable values are left untouched so users may type 13.5.
function formatLockedNumber(value, locked) {
  if (
    !locked ||
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return value
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number.toString()
    : value
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
  const displayedValue =
    formatLockedNumber(value, disabled)
  const showFeedback =
    value !== '' &&
    ['invalid', 'warning'].includes(
      validation?.status,
    )

  function handleBlur() {
    markFieldTouched(field)

    if (
      !disabled &&
      value !== '' &&
      Number.isFinite(Number(value))
    ) {
      setField(
        field,
        Number(value).toString(),
      )
    }
  }

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
          value={displayedValue}
          disabled={disabled}
          aria-invalid={
            validation?.status === 'invalid'
          }
          onBlur={handleBlur}
          onChange={(event) =>
            setField(
              field,
              event.target.value,
            )
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
      <p className="question-helper">
        {helper}
      </p>

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
  onSkipBodyFat,
}) {
  const inputsDisabled = readOnly
  const photosDisabled =
    previewing || readOnly

  if (step === STEP.TIPS) {
    return (
      <fieldset>
        <legend>Let’s Get Started</legend>

        <p className="start-prep-intro">
          Before you begin, have these ready:
        </p>

        <div className="start-prep-list">
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
              <strong>
                Your phone or camera
              </strong>
              <small>
                You will take front, side, and back
                progress photos.
              </small>
            </p>
          </div>
        </div>

        <p className="start-prep-note">
          Wear light, fitted clothing or measure over
          bare skin. Keep the same or a similar outfit
          available for your future progress photos.
        </p>
      </fieldset>
    )
  }

  if (step === STEP.WEIGHT) {
    return (
      <WeightQuestion
        id="start-weight"
        title="What is your starting weight?"
        label="Starting weight"
        value={formatLockedNumber(
          form.starting_weight_lbs,
          readOnly,
        )}
        status={form.starting_weight_status}
        feedback={
          form.starting_weight_lbs !== '' &&
          ['invalid', 'warning'].includes(
            validationByField
              .starting_weight_lbs?.status,
          )
            ? validationByField
                .starting_weight_lbs?.message
            : ''
        }
        state={
          validationByField
            .starting_weight_lbs?.status ===
          'invalid'
            ? 'is-invalid'
            : validationByField
                  .starting_weight_lbs
                  ?.status === 'warning'
              ? 'is-warning'
              : undefined
        }
        disabled={previewing}
        readOnly={readOnly}
        onValueChange={(value) =>
          setField(
            'starting_weight_lbs',
            value,
          )
        }
        onStatusChange={(value) =>
          setField(
            'starting_weight_status',
            value,
          )
        }
      />
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
                ? `${Number(
                    estimatedBodyFat.percent,
                  )}%`
                : 'Estimate unavailable'}
            </strong>

            <span>Juntos Fit estimate</span>
          </div>
        </fieldset>
      )
    }

    return (
      <BodyFatQuestion
        id="start-scale-body-fat"
        value={formatLockedNumber(
          form.body_fat_percent,
          readOnly,
        )}
        unavailable={
          form.body_fat_unavailable
        }
        feedback={
          validationByField
            .body_fat_percent?.message
        }
        state={
          validationByField
            .body_fat_percent?.status ===
          'invalid'
            ? 'is-invalid'
            : undefined
        }
        disabled={inputsDisabled}
        readOnly={readOnly}
        onValueChange={(value) =>
          setField(
            'body_fat_percent',
            value,
          )
        }
        onUnavailableChange={(value) =>
          setField(
            'body_fat_unavailable',
            value,
          )
        }
        onSkip={onSkipBodyFat}
      />
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
            validationByField[
              measurement.field
            ]
          }
          touched={
            touchedFields[
              measurement.field
            ]
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
          <legend>
            Your chosen measurement side
          </legend>

          <p className="locked-side-value">
            {form.measurement_side === 'left'
              ? 'Left Side'
              : 'Right Side'}
          </p>

          <p className="question-helper">
            Your measurement side is locked for this
            plan because your baseline measurements
            and side progress photo have already been
            submitted.
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
          side. It cannot be changed once your Start
          Check-In is submitted.
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
              setField(
                'measurement_side',
                value,
              )
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
          Measure your {side.toUpperCase()} side.
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

  if (step === STEP.PHOTO_TIPS) {
    const side =
      form.measurement_side === 'left'
        ? 'left'
        : 'right'

    return (
      <fieldset>
        <legend>
          Pro-Tips for Progress Photos
        </legend>

        <div className="measurement-tips">
          <p>
            <strong>
              Wear the same or similarly fitted clothing:
            </strong>{' '}
            This makes changes easier to compare from
            one photo check-in to the next.
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
            Try to use the same camera height, distance,
            and location for future photos.
          </p>

          <p>
            <strong>Stand naturally:</strong>{' '}
            Relax your shoulders, keep your arms at your
            sides, and do not flex or suck in.
          </p>

          <p>
            <strong>Your side photo:</strong>{' '}
            Use your {side} side—the same side selected
            for your measurements.
          </p>
        </div>
      </fieldset>
    )
  }

  if (step === STEP.FRONT_PHOTO) {
    return (
      <PhotoField
        pose="front"
        title="Add your FRONT progress photo."
        helper="Stand naturally facing the camera with your body relaxed and your arms resting at your sides. Keep your full body visible from head to feet."
        photo={photos.front}
        uploadingPose={uploadingPose}
        uploadPhoto={uploadPhoto}
        disabled={photosDisabled}
      />
    )
  }

  if (step === STEP.SIDE_PHOTO) {
    const side =
      form.measurement_side || 'chosen'

    return (
      <PhotoField
        pose="side"
        title={`Add your ${side.toUpperCase()} SIDE progress photo.`}
        helper={`Stand naturally with your ${side} side facing the camera, your body relaxed, and your arms resting at your sides. Keep your full body visible from head to feet.`}
        photo={photos.side}
        uploadingPose={uploadingPose}
        uploadPhoto={uploadPhoto}
        disabled={photosDisabled}
      />
    )
  }

  return (
    <PhotoField
      pose="back"
      title="Add your BACK progress photo."
      helper="Stand naturally facing away from the camera with your body relaxed and your arms resting at your sides. Keep your full body visible from head to feet."
      photo={photos.back}
      uploadingPose={uploadingPose}
      uploadPhoto={uploadPhoto}
      disabled={photosDisabled}
    />
  )
}
