# Big Brain Plan Adjustment UI v0.1

## Scope

This pass wires the completed Big Brain backend into the React user flow without moving any coaching legality or persistence rules into the client.

User flow:

**Weekly Results → Coach Review → Plan Adjustment → discussion/revision → explicit Accept or Decline → deterministic server persistence**

## UI decisions made in this pass

1. **Plan Adjustment is a dedicated screen.**
   Weekly Summary remains the report card. It hands off to a focused Plan Adjustment screen instead of embedding a chat/prescription workflow inside the report.

2. **The handoff is shown for the latest completed Weekly only in v0.1.**
   This avoids generating a brand-new adjustment from an old historical Weekly after its intended prescription week has already passed. Historical Plan Adjustment browsing can be added deliberately later.

3. **The current frozen proposal is always the visible source of truth.**
   A conversation revision replaces the visible proposal with the server-returned canonical revision. React does not calculate or mutate prescription numbers.

4. **Acceptance requires a second explicit confirmation.**
   The first button opens a confirmation dialog. The server call happens only after the user confirms the exact Accept/Decline intent.

5. **React sends no prescription values during resolution.**
   The UI calls the existing service with only the proposal ID. The service/backend retain the `proposal_id + accept|decline` contract.

6. **An interrupted coach reply blocks resolution until retried.**
   Conversation reads now include `client_message_id`. If a persisted user turn has no coach reply, the UI restores that exact message, reuses its UUID, and disables Accept/Decline until the reply is completed. This prevents applying an older proposal while the user's challenge/question is still unresolved.

7. **Resolved proposals are read-only.**
   Accepted, declined, and expired states hide the conversation composer and resolution controls. Decline remains final for that proposal revision under the current backend contract.

8. **Coach Review no longer claims the prescription was held.**
   Coach Review explicitly says no prescription changes happen in that stage. The actual recommendation lives in Plan Adjustment.

9. **The Coach bottom-nav item becomes active on Plan Adjustment.**
   This is the first real user-facing Coach workflow, while the rest of the app's Coach nav remains unchanged for now.

10. **Returning from Plan Adjustment preserves the Weekly being reviewed.**
    `WeeklySummaryPage` now consumes the `initialWeekNumber` that `App` was already passing. This fixes an existing navigation gap exposed by the new flow.

## Still intentionally deferred

- Historical Plan Adjustment browser / Coach history.
- A general Coach home screen from the bottom navigation.
- Additional animation/celebration after an accepted adjustment.
- Rich before-vs-after prescription diff UI. v0.1 shows the canonical proposed prescription and a clear action label.
