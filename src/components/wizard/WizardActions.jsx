// Shared two-button wizard navigation.
// Labels and event handlers remain owned by each wizard.
export function WizardActions({
  backLabel = 'Back',
  nextLabel = 'Next',
  onBack,
  onNext,
  backDisabled = false,
  nextDisabled = false,
  busy = false,
  className = '',
}) {
  return (
    <div
      className={`wizard-actions wizard-ui-actions ${className}`.trim()}
    >
      <button
        type="button"
        disabled={busy || backDisabled}
        onClick={onBack}
      >
        {backLabel}
      </button>

      <button
        type="button"
        disabled={busy || nextDisabled}
        onClick={onNext}
      >
        {nextLabel}
      </button>
    </div>
  )
}
