import {
  joinWizardClasses,
} from '../../utils/wizardFieldState'

export function WizardReview({
  children,
  className = '',
}) {
  return (
    <div
      className={joinWizardClasses(
        'wizard-review',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function WizardReviewSection({
  title,
  children,
  className = '',
}) {
  return (
    <section
      className={joinWizardClasses(
        'wizard-review-section',
        className,
      )}
    >
      <h2>{title}</h2>
      <dl>{children}</dl>
    </section>
  )
}

export function WizardReviewItem({
  label,
  value,
  className = '',
}) {
  return (
    <div
      className={joinWizardClasses(
        'wizard-review-item',
        className,
      )}
    >
      <dt>{label}:</dt>
      <dd>
        {value === '' ||
        value === null ||
        value === undefined
          ? 'None'
          : value}
      </dd>
    </div>
  )
}
