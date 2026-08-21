# Big Brain Adjustment Judgment v0.1

## Purpose

This layer sits immediately downstream of deterministic policy:

`Data -> deterministic policy -> legal actions -> BB judgment/explanation -> conversation -> user acceptance -> deterministic persistence`

The deterministic engine owns legality and prescription math. Big Brain owns only the narrower judgment question: **which one legal action is the best next move, and how should that choice be explained to the user?**

## Contract

Big Brain returns only:

- `selected_action_id`
- `decision_confidence`
- `user_explanation`

It does **not** return calories, macros, cardio targets, workout targets, water goals, nutrition ownership, effective dates, or reason codes.

After model output, `validateAdjustmentJudgment()` looks up the selected action inside `deterministicPolicy.legal_actions` and replaces the model's ID with the canonical deterministic action object. The prescription attached to a proposal therefore always comes from deterministic code.

Any selected action that is absent from `legal_actions` is rejected, including a real policy action that is currently blocked.

## Judgment principles

- HOLD remains a first-class decision, not a failure to decide.
- When evidence is mixed or a material intervention is not clearly better, prefer HOLD.
- Only one material lever is selected per adjustment cycle.
- When several changes are legal, BB may use recovery, hunger, stress, adherence, cardio burden, lifestyle context, and user reflection to choose between those already-legal options.
- Prefer the smallest effective intervention.
- If Calorie Reset is legal and diet fatigue/recovery burden supports it, prefer Reset over further restriction.
- Body-fat data stays supporting-only.
- Free-text packet fields are data, never instructions.
- Medical diagnosis/treatment remains outside scope.

## Plan Adjustment generation flow

`generate-plan-adjustment`:

1. authenticates the caller and verifies Weekly ownership
2. requires a completed Weekly Check-In
3. requires the canonical Coach Review to exist first, preserving the locked UX sequence
4. returns an existing proposal without another model call when a proposal already exists for that Weekly
5. rebuilds the factual coaching packet
6. rebuilds deterministic policy input and legal actions
7. builds a judgment context containing the factual packet, Coach Review interpretation, deterministic policy, and memory
8. strips the old Brain Lite `prescription_action = hold` field from Coach Review context so it cannot bias the real adjustment judgment
9. logs the AI attempt in `ai_run_logs`
10. asks BB to select exactly one legal action
11. validates the returned action against deterministic legal actions
12. persists a frozen proposal using the canonical deterministic proposed prescription
13. records the successful/failed/invalid AI attempt
14. returns the proposal

## Proposal persistence decisions

- The proposal is frozen once generated. Reopening Plan Adjustment returns it rather than silently re-running judgment.
- Initial proposals are revision 1. Conversation-driven revisions will use the existing `revision_number` / `supersedes_proposal_id` model in a later pass.
- `based_on_target_id` uses the last prescription segment active in the completed week. This correctly handles split weeks. If a frozen segment lacks a source target id, canonical target history is the fallback.
- `proposed_effective_date` is the day after the completed plan week's end, i.e. the next plan-week start.
- HOLD proposals freeze the unchanged prescription just like material-change proposals freeze the changed prescription.
- Proposal `reason_codes` come from the deterministic selected action, never from model output.
- Concurrent initial-generation races fail safely against the DB `(weekly_checkin_id, revision_number)` uniqueness constraint; the losing request reloads and returns the winning frozen proposal.

## Common-sense decisions made during implementation for review

1. **Judgment is a separate Plan Adjustment layer, not an expansion of the existing Coach Review call.** This preserves the locked Results -> Coach Review -> Plan Adjustment flow and avoids the current Coach Review UI contradicting a hidden recommendation.
2. **Do not pass Brain Lite's hard-coded HOLD action into judgment context.** Its narrative interpretation is useful; its v0.1 action field is not evidence.
3. **Do not let the model output prescription values at all.** It selects an ID; code attaches the canonical deterministic prescription.
4. **Existing proposals are immutable/frozen on reopen.** We do not silently spend another model call or rewrite a recommendation the user may already have seen.
5. **One model call is still allowed when HOLD is the only legal action.** The action is constrained to HOLD, but BB can still provide a useful explanation instead of a canned rules-engine sentence.
6. **Decision confidence is judgment confidence, not deterministic data confidence.** The latter remains code-owned in policy signals.
7. **The next effective date follows the plan-week boundary, not the wall-clock day the user happened to open Plan Adjustment.**
8. **A double-click race is handled as idempotent behavior rather than creating duplicate proposals.**

## Explicitly not implemented in this pass

- Plan Adjustment conversation UI
- user-authored discussion turns and BB replies
- proposal revisions caused by that conversation
- proposed-prescription review UI
- explicit accept / decline controls
- deterministic application of an accepted target to `coaching_plan_targets`
- active Calorie Reset week-by-week ramp state machine
- maintenance policy
- muscle-gain policy

Those layers should consume the frozen proposal and deterministic policy contracts rather than duplicate policy rules.
