# Big Brain Adjustment Conversation v0.1

## Purpose

This layer implements the conversation stage in the locked Big Brain architecture:

`Data -> deterministic policy -> legal actions -> BB judgment/explanation -> conversation -> user acceptance -> deterministic persistence`

It allows the user to discuss a frozen Plan Adjustment proposal, ask why, express a preference, and cause a new proposal revision **only when BB selects a different action that the deterministic policy engine currently marks legal**.

Nothing in this layer accepts or applies a prescription.

## Conversation contract

BB returns only:

- `conversation_action_id`
- `coach_reply`

`conversation_action_id` is constrained to:

- `keep_current`, which means answer/discuss without creating a revision, or
- one action ID from the deterministic policy engine's current `legal_actions` set.

BB never returns calories, macros, cardio values, workout targets, water goals, effective dates, reason codes, or arbitrary proposal data.

`validateAdjustmentConversationTurn()` replaces a selected action ID with the canonical deterministic action object. A blocked or invented action is rejected.

If BB redundantly selects the action already frozen in the current proposal, the turn is canonicalized to `keep_current` so the database does not accumulate meaningless proposal revisions.

## Conversation behavior

The conversation protocol explicitly distinguishes **exploration** from **revision**.

Examples:

- “Why are you holding?” -> answer; no revision.
- “What about adding cardio?” -> normally explain first; mentioning an alternative is not automatically a request to revise.
- “I really do not want calories lower. I would rather add cardio.” -> if cardio is legal and fits the evidence, BB may select the cardio legal-action ID and create a revision.
- “Cut me by 500 calories.” -> impossible unless such an action exists in deterministic policy. In v0.1 it does not; BB must keep or choose another legal proposal and explain the limitation in normal coaching language.
- “Okay, do it.” -> **not acceptance**. The coach may acknowledge that the proposal is ready, but the prescription remains unapplied until the user uses the explicit acceptance action built in the next layer.

## Persistence / idempotency

Migration `20260821123500_bb_adjustment_conversation_turns.sql` adds:

- `client_message_id` on adjustment messages
- `in_reply_to_message_id` on coach replies
- a unique user-message key per Weekly Check-In
- a unique coach reply per user message
- transactional RPC `finalize_coaching_adjustment_turn(...)`

The user message is persisted **before** the AI call. This means a failed AI call does not lose what the user typed.

The client must preserve the same `client_message_id` while retrying the same send. Reusing that ID:

- does not insert the user message twice
- returns an already-committed coach response for free when one exists
- safely retries the AI call if the user message was saved but the prior AI call failed before a coach response was committed

The final database mutation after validation is one transaction:

1. lock the current proposal
2. check whether this user turn was already finalized
3. if revising, mark the old proposal `superseded`
4. insert revision N+1 using canonical deterministic prescription values
5. append the coach reply linked to the resulting proposal and exact user message

This prevents double-click races from leaving two active proposals or a superseded proposal without its replacement.

## Policy freshness decision

The completed Weekly facts remain finalized, but deterministic policy is **re-evaluated on each conversation turn** using the current policy code.

Reason: if policy rules are corrected or tightened while a Plan Adjustment discussion is still open, BB must not create a new revision using a stale formerly-legal option.

A current proposal may be preserved only while its action is still in the current legal-action set. If its action is no longer legal, `keep_current` fails validation and BB must choose a currently legal action instead.

Each newly created revision stores the current policy/rules/contract versions, so proposal history records which deterministic rule set authorized each revision.

## Context / cost controls

The model receives:

- factual coaching packet
- Coach Review narrative, excluding Brain Lite's historical hard-coded prescription action
- current deterministic policy including legal and blocked actions
- current frozen proposal
- recent Plan Adjustment transcript with proposal revision annotations
- coaching memory

Conversation context is bounded to the most recent 20 messages and approximately 18,000 message characters. This keeps old discussion from expanding model context indefinitely while preserving the most recent decision-relevant turns.

All free text is explicitly treated as data, not instructions.

## Common-sense decisions made during implementation for review

1. **Questions do not automatically cause revisions.** The user must clearly prefer a different direction or the discussion must make another legal action meaningfully better.
2. **Clear preferences matter, but only inside the legal-action fence.** User preference can break ties or move from one legal option to another; it cannot legalize a blocked action.
3. **Chat is not acceptance.** Even “do it” leaves the proposal unapplied. This preserves the explicit acceptance wall in the architecture.
4. **Same-action selections do not create revisions.** A revision means the proposed action actually changed.
5. **User text is saved before the AI call.** Losing a message because the model/API failed is unacceptable UX.
6. **Revision + supersede + coach reply are transactional.** This is intentionally DB-owned rather than three best-effort application calls.
7. **Policy is re-evaluated on each turn.** Safety/correctness fixes take precedence over preserving a stale legal-action set during an unresolved discussion.
8. **A stale now-illegal proposal cannot be preserved through conversation.** The next accepted proposal must ultimately come from a currently legal action.
9. **Conversation history is bounded.** Recent turns matter most; unbounded transcript growth would increase cost and eventually create context-quality problems.
10. **One user message receives at most one canonical coach response.** `client_message_id` + `in_reply_to_message_id` make retries deterministic.

## Explicitly not implemented in this pass

- Plan Adjustment conversation UI
- explicit Accept button
- explicit Decline / defer lifecycle action
- deterministic application of an accepted proposal to `coaching_plan_targets`
- validation that the proposal's base target is still current at acceptance time
- active Calorie Reset week-by-week ramp state machine
- maintenance policy
- muscle-gain policy

The next layer should implement **explicit acceptance / decline and deterministic prescription persistence**. It should consume the latest open frozen proposal rather than letting AI write targets directly.
