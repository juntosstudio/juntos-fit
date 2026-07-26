import {
  useEffect,
  useState,
} from 'react'
import {
  WizardActions,
  WizardChoiceGroup,
  WizardPage,
  WizardQuestion,
} from '../components/wizard'
import {
  saveCheckInSettings,
} from '../services/checkInSettingsService'
import {
  normalizeCheckInSettings,
} from '../utils/checkInTracking'
import {
  getErrorMessage,
  logDevelopmentError,
} from '../utils/errors'
import '../styles/wizard.css'

const YES_NO_OPTIONS = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
]

export function CheckInSettingsPage({
  userId,
  initialSettings,
  onSaved,
  onBack,
}) {
  const normalizedInitial =
    normalizeCheckInSettings(
      initialSettings,
    )

  const [form, setForm] = useState(
    normalizedInitial,
  )
  const [savedForm, setSavedForm] =
    useState(normalizedInitial)
  const [saving, setSaving] =
    useState(false)
  const [error, setError] =
    useState('')
  const [success, setSuccess] =
    useState('')

  useEffect(() => {
    const next =
      normalizeCheckInSettings(
        initialSettings,
      )

    setForm(next)
    setSavedForm(next)
  }, [
    initialSettings?.track_water,
    initialSettings?.track_alcohol,
  ])

  function setField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
    setError('')
    setSuccess('')
  }

  async function saveSettings() {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const saved =
        await saveCheckInSettings(
          userId,
          form,
        )

      const normalized =
        normalizeCheckInSettings(saved)

      setForm(normalized)
      setSavedForm(normalized)
      setSuccess(
        'Settings saved. Future check-ins will use these choices.',
      )

      await onSaved?.()
    } catch (saveError) {
      logDevelopmentError(
        'CheckInSettingsPage.saveSettings',
        saveError,
      )

      setError(
        getErrorMessage(
          saveError,
          'Your check-in settings could not be saved.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  const isDirty =
    JSON.stringify(form) !==
    JSON.stringify(savedForm)

  return (
    <WizardPage
      className="checkin-settings-page"
      title="Check-In Settings"
      subtitle="Choose what Juntos Fit asks you to track."
      onBack={onBack}
      status={
        error || success ? (
          <p
            role={error ? 'alert' : 'status'}
          >
            {error || success}
          </p>
        ) : null
      }
      actions={
        <WizardActions
          backLabel="Back"
          nextLabel={
            saving
              ? 'Saving...'
              : 'Save Settings'
          }
          busy={saving}
          nextDisabled={!isDirty}
          onBack={onBack}
          onNext={saveSettings}
        />
      }
    >
      <WizardQuestion
        title="Do you want to track water in your check-ins?"
        helper="Turn this off and future Daily and Weekly Check-Ins will stop asking whether you met your water goal."
      >
        <WizardChoiceGroup
          name="track-water"
          value={form.track_water}
          options={YES_NO_OPTIONS}
          onChange={(value) =>
            setField(
              'track_water',
              value,
            )
          }
        />
      </WizardQuestion>

      <WizardQuestion
        title="Do you want to track alcohol in your check-ins?"
        helper="Turn this off and future Daily and Weekly Check-Ins will stop asking about alcohol."
      >
        <WizardChoiceGroup
          name="track-alcohol"
          value={form.track_alcohol}
          options={YES_NO_OPTIONS}
          onChange={(value) =>
            setField(
              'track_alcohol',
              value,
            )
          }
        />
      </WizardQuestion>

      <p className="wizard-question-helper">
        Changing these settings never deletes answers
        from earlier check-ins.
      </p>
    </WizardPage>
  )
}
