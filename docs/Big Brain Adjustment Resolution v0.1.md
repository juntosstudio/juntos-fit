# Big Brain Adjustment Resolution v0.1

## Purpose

This layer completes the final gate in the locked Big Brain architecture:

`Data -> deterministic policy -> legal actions -> BB judgment/explanation -> conversation -> user acceptance -> deterministic persistence`

The user explicitly accepts or declines one frozen Plan Adjustment proposal. Big Brain does not participate in the persistence call and never writes prescription values to `coaching_plan_targets`.

## Explicit resolution contract

The client sends only:

- `proposal_id`
- `resolution`, which must be exactly `accept` or `decline`

The client does **not** send calories, macros, cardio, workout targets, water goals, effective dates, nutrition ownership, reason codes, or target provenance.

The server owns the final prescription lookup and database mutation.

Chat text is still not acceptance. A message such as “okay, do it” remains only conversation. The explicit acceptance action must call `resolve-plan-adjustment`.

## Final live-policy gate

Before an unresolved proposal can be accepted, the Edge Function rebuilds deterministic policy from the finalized Weekly facts and current policy code.

Acceptance is allowed only when:

1. the proposal action ID is still currently legal, and
2. the proposal's entire frozen prescription still exactly matches the canonical prescription attached to that currently legal action.

This prevents a proposal from being grandfathered merely because an action ID still exists after deterministic policy math changes.

The conversation validator now uses the same rule. If an action ID is still legal but its canonical prescription changed, selecting that same action creates a genuine new proposal revision rather than silently preserving stale numbers.

## Transactional database gate

Migration `20260821123600_bb_adjustment_resolution.sql` adds security-definer RPC `resolve_coaching_adjustment_proposal(...)`.

The transaction:

1. locks the proposal
2. locks the coaching plan
3. makes same-resolution retries idempotent
4. rejects the opposite resolution after a proposal is already resolved
5. verifies this is the latest proposal revision for the Weekly
6. handles decline without creating a target
7. validates proposal lifetime for acceptance
8. resolves the user's current local date from the plan timezone
9. refuses to backdate a late acceptance
10. verifies the proposal's base prescription still materially matches the canonical prescription now active at the actual application date
11. refuses to overwrite another target already scheduled for that application date
12. for HOLD, marks the proposal accepted without inserting a target
13. for a material change, inserts a new immutable `coaching_plan_targets` row using **only the frozen proposal fields** and `prescription_source = 'bb_adjustment'`
14. links the accepted proposal to the inserted target

Target insert + proposal acceptance occur in one database transaction. There is no state where a new target exists without the proposal being accepted, or an accepted material-change proposal exists without its target.

## Expiration / staleness

An unresolved proposal cannot remain actionable forever.

For v0.1, acceptance expires when either:

- the intended next plan week has ended, or
- a later Weekly Check-In has already been completed.

A proposal also becomes stale if its canonical base prescription materially changed after the proposal was formed.

Expired/stale proposals are not applied.

## Late acceptance

The proposed effective date remains the next plan-week boundary, as originally designed.

If the user accepts after that date but still within the intended plan week, the **actual** effective date becomes the user's local acceptance date. The system does not pretend that earlier days used a prescription the user had not yet accepted.

This intentionally creates a split-week prescription, which the existing Weekly prescription snapshot model already supports.

## HOLD and decline

- Accepted HOLD: marks the proposal accepted; **no target row is inserted**.
- Decline: marks the proposal declined; **no target row is inserted**.
- Repeating the same resolution is idempotent.
- Trying to decline an accepted proposal or accept a declined proposal is rejected.

## Common-sense decisions made during implementation for review

1. **Acceptance re-checks current deterministic legality and exact prescription math.** A once-legal proposal is not permanently entitled to persistence.
2. **Late acceptance is never backdated.** Actual effective date is the later of the proposed plan-week start or the user's local acceptance date.
3. **Proposal lifetime is one intended plan week.** Once that week ends or a later Weekly is finalized, use newer evidence instead of applying an old recommendation.
4. **Materially equivalent target rows do not automatically stale a proposal merely because their row IDs differ.** Staleness compares the actual prescription fields, not provenance/row identity.
5. **A target already scheduled on the exact application date wins.** BB does not overwrite it or claim it as its own.
6. **HOLD acceptance creates no redundant target row.** The audit event belongs on the proposal; prescription history should contain actual prescription changes.
7. **Decline does not require policy re-evaluation.** A user may always decline an unresolved recommendation.
8. **Same-resolution retries are idempotent; opposite-resolution retries are conflicts.** Resolution history is immutable.
9. **Plan timezone controls the acceptance date.** Database UTC must not move a user's prescription to the wrong calendar day.
10. **The database, not the Edge Function or AI, constructs the applied target from frozen proposal columns.** This is the final enforcement of deterministic persistence.

## Explicitly not implemented in this pass

- Plan Adjustment UI
- Accept / Decline buttons in React
- visual confirmation / proposed-prescription review screen
- post-acceptance success UI
- active Calorie Reset week-by-week ramp state machine
- maintenance policy
- muscle-gain policy

The backend contract and persistence wall are now ready for the UI layer to consume.
