import {
  useEffect,
  useState,
} from 'react'
import {
  acceptPlanAdjustment,
  createPlanAdjustmentClientMessageId,
  declinePlanAdjustment,
  generatePlanAdjustment,
  loadLatestPlanAdjustment,
  loadPlanAdjustmentConversation,
  sendPlanAdjustmentMessage,
} from '../services/planAdjustmentService'
import { formatDate } from '../utils/formatters'
import {
  findPendingPlanAdjustmentTurn,
  formatCardioIntensity,
  formatPlanAdjustmentAction,
  formatPlanAdjustmentStatus,
  isHoldPlanAdjustment,
  isPlanAdjustmentOpen,
  isPlanAdjustmentWindowExpired,
} from '../utils/planAdjustmentUi'
import '../styles/planAdjustment.css'

function PrescriptionMetric({
  value,
  label,
  suffix = '',
}) {
  return (
    <div className="plan-adjustment-metric">
      <strong>
        {value ?? '—'}
        {value !== null && value !== undefined
          ? suffix
          : ''}
      </strong>
      <span>{label}</span>
    </div>
  )
}

function ProposalPrescription({ proposal }) {
  const prescription =
    proposal?.proposed_prescription ?? {}
  const intensity = formatCardioIntensity(
    prescription.cardio_intensity_target,
  )

  return (
    <div className="plan-adjustment-prescription">
      <div className="plan-adjustment-prescription-grid">
        <PrescriptionMetric
          value={prescription.calorie_target}
          label="Calories / day"
        />
        <PrescriptionMetric
          value={prescription.protein_grams}
          label="Protein"
          suffix="g"
        />
        <PrescriptionMetric
          value={prescription.carb_grams}
          label="Carbs"
          suffix="g"
        />
        <PrescriptionMetric
          value={prescription.fat_grams}
          label="Fat"
          suffix="g"
        />
      </div>

      <div className="plan-adjustment-activity-row">
        <span>
          <strong>
            {prescription.weekly_workout_target ?? '—'}
          </strong>{' '}
          workouts / week
        </span>
        <span>
          <strong>
            {prescription.weekly_cardio_target_minutes ??
              '—'}
          </strong>{' '}
          cardio min / week
        </span>
        {intensity && (
          <span>
            <strong>{intensity}</strong> cardio
          </span>
        )}
      </div>
    </div>
  )
}

function ProposalCard({ proposal }) {
  return (
    <section className="plan-adjustment-proposal-card">
      <div className="plan-adjustment-proposal-header">
        <div>
          <p className="plan-adjustment-eyebrow">
            Juntos Coach recommends
          </p>
          <h2>
            {formatPlanAdjustmentAction(
              proposal?.action_id,
            )}
          </h2>
        </div>

        <span
          className={`plan-adjustment-status is-${proposal?.status ?? 'unknown'}`}
        >
          {formatPlanAdjustmentStatus(
            proposal?.status,
          )}
        </span>
      </div>

      {Number(proposal?.revision_number) > 1 && (
        <p className="plan-adjustment-revision">
          Revision {proposal.revision_number}
        </p>
      )}

      <p className="plan-adjustment-explanation">
        {proposal?.user_explanation ||
          'Juntos Coach prepared this recommendation from your completed week and current coaching policy.'}
      </p>
    </section>
  )
}

function ProposedPrescriptionCard({ proposal }) {
  const hold = isHoldPlanAdjustment(proposal)
  const actionId = proposal?.action_id ?? ''
  const proposalSummary = hold
    ? 'No Changes'
    : actionId.startsWith('nutrition_')
      ? 'Nutrition Changes'
      : actionId.startsWith('cardio_')
        ? 'Cardio Change'
        : actionId.startsWith('calorie_reset_')
          ? 'Calorie Reset'
          : 'Recommended Changes'
  const effectiveDate =
    proposal?.effective_date ??
    proposal?.proposed_effective_date

  return (
    <section className="plan-adjustment-prescription-card">
      <p className="plan-adjustment-eyebrow">
        Final proposal
      </p>
      <h2>Proposed Next-Week Prescription — {proposalSummary}</h2>

      <ProposalPrescription proposal={proposal} />

      {!hold && (
        <p className="plan-adjustment-effective-date">
          {`${
            proposal?.status === 'accepted'
              ? 'Effective'
              : 'Proposed effective date'
          }: ${formatDate(effectiveDate)}`}
        </p>
      )}
    </section>
  )
}

function Conversation({ messages }) {
  if (!messages.length) {
    return (
      <p className="plan-adjustment-conversation-empty">
        Ask why, challenge the recommendation, or tell
        Juntos Coach what you would prefer. Any revision
        still has to pass deterministic policy.
      </p>
    )
  }

  return (
    <div
      className="plan-adjustment-conversation"
      aria-live="polite"
    >
      {messages.map((message) => (
        <article
          key={message.id}
          className={`plan-adjustment-message is-${message.role}`}
        >
          <strong>
            {message.role === 'coach'
              ? 'Juntos Coach'
              : 'You'}
          </strong>
          <p>{message.content}</p>
        </article>
      ))}
    </div>
  )
}

function ResolutionSummary({ proposal }) {
  if (proposal?.status === 'accepted') {
    return (
      <section className="plan-adjustment-resolution is-accepted">
        <div
          className="plan-adjustment-resolution-icon"
          aria-hidden="true"
        >
          ✓
        </div>
        <h2>Plan Adjustment Accepted</h2>
        <p>
          {isHoldPlanAdjustment(proposal)
            ? 'Your current prescription stays in place.'
            : `Your accepted prescription is effective ${formatDate(
                proposal.effective_date,
              )}.`}
        </p>
      </section>
    )
  }

  if (proposal?.status === 'declined') {
    return (
      <section className="plan-adjustment-resolution">
        <h2>Recommendation Declined</h2>
        <p>
          Your prescription was not changed by this Plan
          Adjustment.
        </p>
      </section>
    )
  }

  if (proposal?.status === 'expired') {
    return (
      <section className="plan-adjustment-resolution">
        <h2>Plan Adjustment Expired</h2>
        <p>
          This recommendation was not applied. Your next
          completed Weekly Check-In will create a fresh
          coaching decision.
        </p>
      </section>
    )
  }

  return null
}

export function PlanAdjustmentPage({
  weeklyCheckInId,
  weekNumber,
  weeklySubmittedAt,
  onBack,
  onResolved,
  onOpenToday,
  onOpenHistory,
  onOpenPlan,
  onOpenSettings,
}) {
  const [proposal, setProposal] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolutionPrompt, setResolutionPrompt] =
    useState(null)
  const [pendingRetry, setPendingRetry] =
    useState(null)
  const [windowClosedWithoutProposal, setWindowClosedWithoutProposal] =
    useState(false)

  async function refreshConversation() {
    const nextMessages =
      await loadPlanAdjustmentConversation(
        weeklyCheckInId,
      )

    setMessages(nextMessages)

    const pending =
      findPendingPlanAdjustmentTurn(
        nextMessages,
      )

    setPendingRetry(pending)

    if (pending) {
      setDraft(pending.content ?? '')
    }

    return nextMessages
  }

  async function refreshProposal() {
    const nextProposal =
      await loadLatestPlanAdjustment(
        weeklyCheckInId,
      )

    setProposal(nextProposal)
    return nextProposal
  }

  useEffect(() => {
    if (!weeklyCheckInId) {
      setLoading(false)
      setError(
        'A completed Weekly Check-In is required to review a Plan Adjustment.',
      )
      return undefined
    }

    let cancelled = false

    async function loadAdjustment() {
      setLoading(true)
      setError('')

      try {
        const [existingProposal, existingMessages] =
          await Promise.all([
            loadLatestPlanAdjustment(
              weeklyCheckInId,
            ),
            loadPlanAdjustmentConversation(
              weeklyCheckInId,
            ),
          ])

        let nextProposal = existingProposal

        if (
          !nextProposal &&
          isPlanAdjustmentWindowExpired({
            weeklySubmittedAt,
          })
        ) {
          if (!cancelled) {
            setWindowClosedWithoutProposal(true)
            setMessages(existingMessages)
          }
          return
        }

        if (!nextProposal) {
          nextProposal =
            await generatePlanAdjustment(
              weeklyCheckInId,
            )
        }

        if (cancelled) {
          return
        }

        setWindowClosedWithoutProposal(false)
        setProposal(nextProposal)
        setMessages(existingMessages)

        const pending =
          findPendingPlanAdjustmentTurn(
            existingMessages,
          )

        setPendingRetry(pending)

        if (pending) {
          setDraft(pending.content ?? '')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              'Juntos Coach could not load your Plan Adjustment right now.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAdjustment()

    return () => {
      cancelled = true
    }
  }, [weeklyCheckInId, weeklySubmittedAt])

  async function retryLoad() {
    if (!weeklyCheckInId || loading) {
      return
    }

    setLoading(true)
    setError('')

    try {
      let nextProposal =
        await loadLatestPlanAdjustment(
          weeklyCheckInId,
        )

      if (
        !nextProposal &&
        isPlanAdjustmentWindowExpired({
          weeklySubmittedAt,
        })
      ) {
        setWindowClosedWithoutProposal(true)
        setProposal(null)
        return
      }

      nextProposal =
        nextProposal ??
        (await generatePlanAdjustment(
          weeklyCheckInId,
        ))

      setWindowClosedWithoutProposal(false)
      setProposal(nextProposal)
      await refreshConversation()
    } catch (loadError) {
      setError(
        loadError?.message ||
          'Juntos Coach could not load your Plan Adjustment right now.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function submitMessage(event) {
    event.preventDefault()

    const cleanMessage = draft.trim()

    if (
      !cleanMessage ||
      sending ||
      !isPlanAdjustmentOpen(proposal)
    ) {
      return
    }

    const retryingSavedTurn = Boolean(
      pendingRetry &&
        String(pendingRetry.content ?? '').trim() ===
          cleanMessage,
    )

    const clientMessageId = retryingSavedTurn
      ? pendingRetry.client_message_id
      : createPlanAdjustmentClientMessageId()

    setSending(true)
    setError('')

    try {
      const result =
        await sendPlanAdjustmentMessage({
          weeklyCheckInId,
          message: cleanMessage,
          clientMessageId,
        })

      setProposal(result.proposal)
      setDraft('')
      setPendingRetry(null)

      setMessages((current) => {
        const coachMessage = result.message
        const userMessageId =
          coachMessage?.in_reply_to_message_id ??
          `pending-${clientMessageId}`
        const next = [...current]

        if (
          !next.some(
            (message) =>
              message.id === userMessageId,
          )
        ) {
          next.push({
            id: userMessageId,
            role: 'user',
            content: cleanMessage,
            client_message_id: clientMessageId,
          })
        }

        if (
          coachMessage?.id &&
          !next.some(
            (message) =>
              message.id === coachMessage.id,
          )
        ) {
          next.push(coachMessage)
        }

        return next
      })

      try {
        await refreshConversation()
      } catch {
        // The turn itself succeeded. Keep the returned messages visible
        // and let the next page load reconcile the stored conversation.
      }
    } catch (sendError) {
      setError(
        sendError?.message ||
          'Juntos Coach could not reply right now.',
      )

      try {
        await refreshConversation()
      } catch {
        setPendingRetry({
          content: cleanMessage,
          client_message_id: clientMessageId,
        })
      }
    } finally {
      setSending(false)
    }
  }

  async function resolveAdjustment() {
    if (
      !resolutionPrompt ||
      !proposal?.id ||
      resolving
    ) {
      return
    }

    const resolution = resolutionPrompt

    setResolving(true)
    setError('')

    try {
      const result =
        resolution === 'accept'
          ? await acceptPlanAdjustment(
              proposal.id,
            )
          : await declinePlanAdjustment(
              proposal.id,
            )

      setProposal(result.proposal)
      setResolutionPrompt(null)
      setPendingRetry(null)

      try {
        await onResolved?.(result)
      } catch {
        // The adjustment is already committed. A dashboard refresh
        // failure must not make a successful resolution look failed.
      }
    } catch (resolutionError) {
      setResolutionPrompt(null)
      setError(
        resolutionError?.message ||
          'Juntos Coach could not resolve this Plan Adjustment right now.',
      )

      try {
        await refreshProposal()
        await refreshConversation()
      } catch {
        // Preserve the resolution error; retry remains available.
      }
    } finally {
      setResolving(false)
    }
  }

  const windowExpired =
    isPlanAdjustmentWindowExpired({
      proposal,
      weeklySubmittedAt,
    })
  const displayProposal =
    proposal?.status === 'proposed' &&
    windowExpired
      ? { ...proposal, status: 'expired' }
      : proposal
  const open = isPlanAdjustmentOpen(
    displayProposal,
    { weeklySubmittedAt },
  )
  const hold = isHoldPlanAdjustment(displayProposal)
  const retryingSavedTurn = Boolean(
    pendingRetry &&
      String(pendingRetry.content ?? '').trim() ===
        draft.trim(),
  )
  const decisionBlocked =
    sending || resolving || Boolean(pendingRetry)

  return (
    <>
      <main className="container plan-adjustment-page">
        <button
          type="button"
          className="text-button"
          onClick={onBack}
        >
          ← Back to Weekly Review
        </button>

        <header className="plan-adjustment-page-header">
          <p className="plan-adjustment-eyebrow">
            {weekNumber
              ? `Week ${weekNumber} coaching`
              : 'Weekly coaching'}
          </p>
          <h1>Discuss Your Recommendation</h1>
          <p>
            Ask questions, challenge the recommendation, or tell
            Juntos Coach what you would prefer. You can accept or
            decline the latest legal recommendation when you are ready.
          </p>
        </header>

        {loading && (
          <section
            className="plan-adjustment-loading"
            aria-live="polite"
          >
            <h2>Building Your Recommendation</h2>
            <p>
              Juntos Coach is applying your coaching
              policy to the completed week…
            </p>
          </section>
        )}

        {error && (
          <section
            className="plan-adjustment-error"
            role="alert"
          >
            <strong>Plan Adjustment needs attention.</strong>
            <p>{error}</p>
            {!proposal && (
              <button
                type="button"
                disabled={loading}
                onClick={retryLoad}
              >
                Try Again
              </button>
            )}
          </section>
        )}

        {!loading && windowClosedWithoutProposal && (
          <section className="plan-adjustment-resolution">
            <h2>Plan Adjustment Window Closed</h2>
            <p>
              The 24-hour decision window for this Weekly
              Check-In has closed. No prescription change
              was applied. Your next completed Weekly
              Check-In will create a fresh coaching decision.
            </p>
          </section>
        )}

        {!loading && proposal && (
          <>
            <ProposalCard proposal={displayProposal} />

            {open && (
              <section className="plan-adjustment-discussion-card">
                <div className="plan-adjustment-section-heading">
                  <div>
                    <p className="plan-adjustment-eyebrow">
                      Talk it through
                    </p>
                    <h2>Discuss With Juntos Coach</h2>
                  </div>
                </div>

                <Conversation messages={messages} />

                <form
                  className="plan-adjustment-composer"
                  onSubmit={submitMessage}
                >
                  <label htmlFor="plan-adjustment-message">
                    {retryingSavedTurn
                      ? 'Your message was saved. Retry the coach reply.'
                      : 'Message Juntos Coach'}
                  </label>
                  <textarea
                    id="plan-adjustment-message"
                    value={draft}
                    maxLength={2000}
                    readOnly={retryingSavedTurn}
                    disabled={sending || resolving}
                    placeholder="Ask why, tell me what you prefer, or challenge the recommendation."
                    onChange={(event) => {
                      setDraft(event.target.value)
                      setError('')
                    }}
                  />

                  <div className="plan-adjustment-composer-footer">
                    <small>
                      Discussion can revise the recommendation,
                      but it cannot bypass coaching policy.
                    </small>
                    <button
                      type="submit"
                      disabled={
                        !draft.trim() ||
                        sending ||
                        resolving
                      }
                    >
                      {sending
                        ? 'Juntos Coach is thinking…'
                        : retryingSavedTurn
                          ? 'Retry Coach Reply'
                          : 'Send'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <ProposedPrescriptionCard
              proposal={displayProposal}
            />

            {!open && (
              <ResolutionSummary
                proposal={displayProposal}
              />
            )}

            {open && (
              <section className="plan-adjustment-decision-card">
                <p className="plan-adjustment-eyebrow">
                  Your decision
                </p>
                <h2>
                  {hold
                    ? 'Keep This Prescription?'
                    : 'Apply This Prescription?'}
                </h2>
                <p>
                  Your acceptance is required before Juntos Coach
                  applies this prescription.
                </p>

                {pendingRetry && (
                  <p className="plan-adjustment-pending-note">
                    Finish the pending coach reply before
                    accepting or declining this revision.
                  </p>
                )}

                <div className="plan-adjustment-decision-actions">
                  <button
                    type="button"
                    disabled={decisionBlocked}
                    onClick={() =>
                      setResolutionPrompt('accept')
                    }
                  >
                    Accept Recommendation
                  </button>
                  <button
                    type="button"
                    className="plan-adjustment-decline-button"
                    disabled={decisionBlocked}
                    onClick={() =>
                      setResolutionPrompt('decline')
                    }
                  >
                    Decline Recommendation
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <nav
        className="bottom-navigation"
        aria-label="Main navigation"
      >
        <button
          type="button"
          onClick={onOpenToday}
        >
          Today
        </button>
        <button
          type="button"
          onClick={onOpenHistory}
        >
          Progress
        </button>
        <button
          type="button"
          onClick={onOpenPlan}
        >
          Plan
        </button>
        <button
          type="button"
          className="is-active"
          aria-current="page"
        >
          Coach
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </nav>

      {resolutionPrompt && (
        <div className="confirmation-overlay">
          <section
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-adjustment-resolution-title"
          >
            <h2 id="plan-adjustment-resolution-title">
              {resolutionPrompt === 'accept'
                ? hold
                  ? 'Keep This Prescription?'
                  : 'Apply This Prescription?'
                : 'Decline This Recommendation?'}
            </h2>

            <p>
              {resolutionPrompt === 'accept'
                ? hold
                  ? 'You are explicitly accepting Juntos Coach’s recommendation to keep your current prescription unchanged.'
                  : `You are explicitly accepting this frozen prescription. It will become effective no earlier than ${formatDate(
                      proposal?.proposed_effective_date,
                    )}.`
                : 'Declining will not write a new prescription or change your current plan.'}
            </p>

            <div className="plan-adjustment-confirm-actions">
              <button
                type="button"
                className="plan-adjustment-decline-button"
                disabled={resolving}
                onClick={() =>
                  setResolutionPrompt(null)
                }
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={resolving}
                onClick={resolveAdjustment}
              >
                {resolving
                  ? 'Saving…'
                  : resolutionPrompt === 'accept'
                    ? hold
                      ? 'Yes, Keep My Plan'
                      : 'Yes, Apply It'
                    : 'Yes, Decline It'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
