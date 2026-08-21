# Big Brain Deterministic Policy v0.1

## Purpose

This layer is the deterministic guardrail between normalized coaching data and Big Brain judgment.

**Required architecture:**

`Data -> deterministic policy -> legal actions -> BB judgment/explanation -> conversation -> user acceptance -> deterministic persistence`

The policy engine does not call OpenAI, read/write the database, or choose the final action. It computes signals, exposes the actions that are legally available, and explains why other actions are blocked. Big Brain may choose only from `legal_actions`. `HOLD` is always legal.

## v0.1 scope

v0.1 implements fat-loss policy only. Maintenance and muscle-gain inputs fail closed to `HOLD` until separate deterministic policies exist.

Implemented action candidates:

- `hold`
- `nutrition_decrease_100`
- `nutrition_increase_100`
- `cardio_increase_60_to_75`
- `cardio_increase_75_to_90`
- `cardio_increase_intensity_to_moderate`
- `calorie_reset_increase_100` (Calorie Reset entry step)

A blocked-only `cardio_progression_unavailable` candidate is used when the current cardio prescription is outside the v0.1 ladder. It is never a legal action.

## Core deterministic rules

### Observation clock

- The first two completed weeks are observation-only for normal material prescription changes.
- A normal material change requires two full completed weeks under the current prescription.
- Split-prescription weeks must not increment `full_weeks_under_current_prescription`; that is a data-adapter responsibility.
- At most one material prescription lever may be accepted per adjustment cycle. The engine may expose more than one legal candidate; BB/user choice selects one.

### Evidence gates

Normal rate-based changes require:

- nutrition adherence >= 85%
- nutrition coverage >= 80%
- at least 5 weigh-ins in the current week
- at least 5 weigh-ins in the previous week
- a known positive target loss rate

80-84% adherence remains usable evidence but is not strong enough to legalize a material prescription change.

Missing waist data is represented as unknown; it is not falsely labeled as "no waist progress" and does not by itself block a weight-supported decision.

### Weight pace buckets

Pace is calculated as actual week-over-week loss divided by target loss for the same interval.

- `<50%` of target: very slow
- `50-74%`: slow
- `75-125%`: on-target HOLD band
- `>125%`: fast

A routine `-100 kcal/day` may become legal below 75% of target when all other gates pass. A routine `+100 kcal/day` may become legal above 125% of target, or when meaningful diet fatigue is present while loss remains at least 75% of target.

### Nutrition ownership

`self_managed` nutrition blocks proactive Juntos calorie/macro changes. It does not prevent coaching interpretation or an otherwise-independent cardio action.

### Macro policy

- Protein is held stable during routine +/-100 adjustments.
- Carbs are the most flexible macro.
- Fat is protected but may move when an explicit fat floor permits it.
- Exact 100-calorie integer macro combinations are used:
  - Higher-carb: 25g carbs / 0g fat
  - Balanced: 16g carbs / 4g fat
  - Lower-carb: 7g carbs / 8g fat
- On a decrease, if the preferred combination would cross the supplied fat floor, the engine searches safer exact-100 combinations.
- If no fat floor is supplied, the engine preserves the current fat target instead of assuming a zero-gram floor.
- If complete calorie/protein/carb/fat targets are unavailable, the macro change fails closed.

### Waist and body fat

A >=0.25-inch week-over-week waist decrease counts as meaningful supporting progress and blocks an otherwise-unnecessary calorie cut/cardio escalation.

A >=0.5 percentage-point body-fat decrease is supporting evidence only. Body fat never creates a prescription-change action by itself. In Calorie Reset plateau detection, continued body-fat progress may prevent a plateau finding; it cannot create Reset eligibility.

### Recovery and diet fatigue

v0.1 marks a recovery concern when either:

- at least two of sleep, energy, and recovery are <=2, or
- at least one is <=2 and stress is >=4.

Diet fatigue is present when hunger is >=4 or a recovery concern is present.

Recovery concern blocks further calorie cuts and cardio escalation. Diet fatigue can support a calorie increase when weight-loss pace is still meaningful.

### Cardio ladder

v0.1 ordinary cardio progression is deliberately narrow:

- 60 -> 75 minutes/week
- 75 -> 90 minutes/week
- 90 minutes at null/easy intensity -> moderate intensity

The current cardio target must have been completed (>=100%) before escalation. Targets outside this ladder fail closed instead of the engine inventing a progression.

For Calorie Reset eligibility, cardio is considered "addressed" at 90 minutes with moderate/hard intensity. It is also considered addressed at 90 minutes when recovery concern is present so the engine does not demand harder cardio from someone already showing recovery strain.

### Calorie Reset entry

Reset eligibility requires all five hard criteria:

1. >=10 continuous weeks in a meaningful deficit
2. >=2 prior calorie reductions
3. cardio addressed
4. a high-quality three-week plateau
5. diet fatigue

Reset watch may begin at 8 continuous deficit weeks when at least one later-stage signal (prior reductions, plateau, or fatigue) is already present.

The three-week plateau test requires all three consecutive weeks to have strong adherence/coverage and >=5 weigh-ins. Weight loss across the two intervals must be <25% of expected target loss, with no meaningful waist progress and no supporting body-fat progress.

The first Reset increase restores carbs first: `+25g carbs`, with protein and fat unchanged, regardless of the ordinary macro-distribution preference.

`calorie_reset_increase_100` in v0.1 represents **entry into** the Reset. The later weekly +100 Reset ramp is intentionally not modeled yet because it requires active Reset state, maintenance/ceiling information, and the conversation/persistence layer. Do not reuse the normal two-week observation clock to accidentally turn a planned weekly Reset ramp into an every-other-week ramp.

## Data adapter contract

The policy engine intentionally accepts normalized evidence instead of querying app tables. `policyInputAdapter.ts` now converts the finalized coaching packet into `DeterministicPolicyInput` deterministically.

The live adapter derives:

- `target_loss_rate_pct_per_week` from the v0.1 fat-loss default of **0.75% body weight/week**. This is explicit policy configuration, not an AI guess. A future plan-level target-rate setting can replace this default without changing the engine contract.
- `full_weeks_under_current_prescription` from consecutive full seven-day prescription segments. Split weeks do not count. The clock compares material prescription values, not target-row IDs, so inserting an identical immutable target row does not falsely reset observation.
- `continuous_deficit_weeks` from completed fat-loss plan weeks plus answered `pre_plan_deficit_weeks`. Unknown pre-plan history contributes zero while known in-plan deficit time remains usable.
- `prior_calorie_reductions` from ordered canonical effective-dated target history by counting actual downward calorie transitions.
- adherence and coverage from the deterministic nutrition-adherence layer already frozen into Weekly when available.
- current/previous/recent weekly evidence from finalized check-in data.
- macro-distribution preference from `user_settings`, with the previously documented Balanced fallback when unanswered.
- nutrition ownership and prescribed cardio intensity from prescription metadata.
- `minimum_fat_grams` remains `null` until an explicit user/plan floor exists; the macro engine therefore protects current fat instead of inventing a floor.

Historical program weeks prefer immutable `weekly_plan_prescriptions` snapshots when available. Canonical target history is only a fallback for older/missing snapshots.

## Live Weekly integration

`generate-weekly-coach-review` now follows this order:

1. build the normalized coaching packet
2. build deterministic policy input
3. evaluate deterministic legal/blocked actions
4. run existing Coach Lite assessment
5. persist the review snapshot

The deterministic input and result are stored inside the review's `input_snapshot`, and the Edge Function response also returns `policy`. Coach Lite **does not consume or choose from this policy yet**; its prompt/schema remain HOLD-only until the BB judgment phase is deliberately implemented. This lets the policy spine run against real Weekly data without silently changing current AI behavior.

## Common-sense decisions made during implementation for review

These were not treated as reasons to stop coding; they are explicit so product can approve/change them later:

1. **Fail closed outside fat loss.** Maintenance and muscle gain return HOLD only until their own policies are specified.
2. **One accepted material lever per cycle.** The engine may expose both a nutrition and cardio action as legal, but BB/user acceptance should choose one rather than stacking both automatically.
3. **Unknown fat floor means preserve fat.** This is safer than silently treating zero as the floor.
4. **Unknown waist means unknown, not "no progress."** Missing waist does not block a decision supported by the required weight/adherence data.
5. **Unsupported cardio prescriptions fail closed.** v0.1 does not manufacture a 45->60 or >90-minute progression that was never specified.
6. **Recovery strain can count as cardio already addressed at 90 minutes.** This prevents Reset eligibility from demanding more intensity when recovery is already poor.
7. **Recovery concern contributes to diet fatigue.** This makes it a reason to avoid further restriction and can support +100 when loss pace is still meaningful.
8. **Reset plateau is stricter than the ordinary slow-loss gate.** Reset requires <25% of expected loss across the three-week window, not merely <75% of target.
9. **Reset entry still requires two completed Juntos observation weeks.** Pre-Juntos deficit history can satisfy the 10-week duration criterion, but Juntos must still have enough current-plan evidence before proposing entry.
10. **Reset restores carbs first.** This is separate from the ordinary Balanced/Higher-Carb/Lower-Carb +/-100 helper.
11. **Fat-loss target pace defaults to 0.75%/week in v0.1.** The app does not currently collect a plan-specific pace, so the adapter uses the midpoint of the common 0.5-1.0%/week fat-loss range as explicit deterministic policy configuration. This should become a plan-level input later rather than staying implicit forever.
12. **Known in-plan fat-loss weeks count as deficit exposure.** `pre_plan_deficit_weeks` extends that clock when answered; unknown pre-plan history does not erase weeks Juntos actually observed. Active Calorie Reset will need to pause/break this clock when its state machine is implemented.
13. **Observation compares material values, not row identity.** A new immutable target row with the same calories/macros/cardio/etc. does not restart the two-week observation clock.
14. **Frozen Weekly prescription history wins.** Historical policy evidence uses `weekly_plan_prescriptions` when present so later target-history repair cannot rewrite what was actually prescribed that week.
15. **Corrupt/missing goal fails closed.** The adapter routes an unknown goal through the unsupported maintenance path rather than accidentally enabling fat-loss changes.

## Explicitly not implemented in this pass

- OpenAI/BB judgment from the deterministic legal-action set (Coach Lite remains HOLD-only)
- proposal conversation UI
- user acceptance flow
- deterministic DB persistence wiring
- active Calorie Reset weekly-ramp state machine
- maintenance policy
- muscle-gain policy

Those layers should consume this contract rather than duplicate its rules.
