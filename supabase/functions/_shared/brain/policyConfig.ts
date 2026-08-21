export const DETERMINISTIC_POLICY_VERSION =
  'juntos_deterministic_policy_v0.1'

export const DETERMINISTIC_POLICY_CONTRACT_VERSION =
  'juntos_policy_contract_v0.1'

export const DETERMINISTIC_RULES_VERSION =
  'juntos_policy_rules_v0.1'

export const POLICY_DEFAULTS = Object.freeze({
  fatLossTargetRatePctPerWeek: 0.75,
  macroDistributionPreference: 'balanced' as const,
})

export const POLICY_THRESHOLDS = Object.freeze({
  nutritionAdherenceStrong: 85,
  nutritionAdherenceUsable: 80,
  nutritionCoverageMinimum: 80,
  weightReadingsMinimum: 5,
  fullObservationWeeksRequired: 2,

  paceVerySlowUpperExclusive: 50,
  paceSlowUpperExclusive: 75,
  paceOnTargetUpperInclusive: 125,

  meaningfulWaistProgressInches: 0.25,
  supportingBodyFatProgressPoints: 0.5,

  cardioCompletionMinimumPercent: 100,
  cardioMinutesFirstStep: 60,
  cardioMinutesSecondStep: 75,
  cardioMinutesMaximum: 90,

  calorieAdjustment: 100,

  calorieResetMinimumDeficitWeeks: 10,
  calorieResetWatchDeficitWeeks: 8,
  calorieResetMinimumPriorReductions: 2,
  calorieResetPlateauWeeks: 3,

  highHungerScore: 4,
  lowRecoveryScore: 2,
  highStressScore: 4,
})

export const POLICY_CONSTRAINTS = Object.freeze([
  'HOLD is always a legal action.',
  'Big Brain may choose only from actions the deterministic policy marks legal.',
  'At most one material prescription lever may be changed per accepted adjustment cycle.',
  'The first two completed weeks are observation-only for normal fat-loss prescription changes.',
  'After a material prescription change, two full completed weeks under the new prescription are required before another normal material change.',
  'A split prescription week does not count as a full observation week.',
  'Nutrition decreases require Juntos-managed nutrition, strong adherence, adequate coverage, adequate weight data, and a known target loss rate.',
  'Self-managed nutrition blocks proactive Juntos nutrition changes but does not block coaching interpretation or independent cardio policy.',
  'Protein is held stable during routine +/-100 calorie adjustments; fat is protected and carbs remain the most flexible macro.',
  'Estimated body fat is supporting evidence only and can never by itself trigger a prescription change.',
  'Calorie Reset is unavailable before 10 continuous weeks in a meaningful deficit.',
])
