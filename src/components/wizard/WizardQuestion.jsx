import {
  joinWizardClasses,
} from '../../utils/wizardFieldState'

// Shared Create Plan-style question section.
// The question itself is unboxed; visual emphasis
// belongs to the answer controls.
export function WizardQuestion({
  title,
  helper,
  className = '',
  children,
}) {
  return (
    <fieldset
      className={joinWizardClasses(
        'wizard-question',
        className,
      )}
    >
      <legend>{title}</legend>

      {helper && (
        <p className="wizard-question-helper">
          {helper}
        </p>
      )}

      <div className="wizard-question-content">
        {children}
      </div>
    </fieldset>
  )
}
