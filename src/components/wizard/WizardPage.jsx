import {
  joinWizardClasses,
} from '../../utils/wizardFieldState'

// Shared visual shell for every guided wizard.
// The wizard still owns its own steps, validation,
// form state, persistence, and branching logic.
export function WizardPage({
  className = '',
  title,
  subtitle,
  status,
  progress,
  progressLabel = 'Wizard progress',
  stepLabel,
  onBack,
  backLabel = 'Back to Dashboard',
  children,
  actions,
  footer,
}) {
  const hasProgress =
    Number.isFinite(Number(progress))

  return (
    <main
      className={joinWizardClasses(
        'container',
        'wizard-page',
        className,
      )}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
        >
          {backLabel}
        </button>
      )}

      <h1>{title}</h1>

      {subtitle && (
        <p className="wizard-page-subtitle">
          {subtitle}
        </p>
      )}

      {status}

      {hasProgress && (
        <>
          <progress
            max="100"
            value={Math.min(
              100,
              Math.max(0, Number(progress)),
            )}
            aria-label={progressLabel}
          />

          {stepLabel && (
            <p className="wizard-step-label">
              {stepLabel}
            </p>
          )}
        </>
      )}

      {children}

      {actions}

      {footer}
    </main>
  )
}
