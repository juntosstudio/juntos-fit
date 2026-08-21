export type CoachingGoal =
  | 'fat_loss'
  | 'maintenance'
  | 'muscle_gain'

export type NutritionOwnership =
  | 'juntos_managed'
  | 'self_managed'

export type MacroDistributionPreference =
  | 'balanced'
  | 'higher_carb'
  | 'lower_carb'

export type CardioIntensityTarget =
  | 'easy'
  | 'moderate'
  | 'hard'

export type PolicyDataConfidence =
  | 'high'
  | 'medium'
  | 'low'

export type CalorieResetStatus =
  | 'not_eligible'
  | 'watch'
  | 'eligible'

export type PolicyActionId =
  | 'hold'
  | 'nutrition_decrease_100'
  | 'nutrition_increase_100'
  | 'cardio_increase_60_to_75'
  | 'cardio_increase_75_to_90'
  | 'cardio_increase_intensity_to_moderate'
  | 'cardio_progression_unavailable'
  | 'calorie_reset_increase_100'

export type PolicyActionCategory =
  | 'hold'
  | 'nutrition'
  | 'cardio'
  | 'calorie_reset'

export type PolicyReasonCode =
  | 'HOLD_ALWAYS_LEGAL'
  | 'FAT_LOSS_POLICY_ACTIVE'
  | 'GOAL_NOT_SUPPORTED_FOR_ADJUSTMENT'
  | 'FIRST_TWO_WEEKS_OBSERVATION'
  | 'OBSERVATION_CLOCK_READY'
  | 'OBSERVATION_CLOCK_NOT_READY'
  | 'NUTRITION_JUNTOS_MANAGED'
  | 'NUTRITION_SELF_MANAGED'
  | 'NUTRITION_ADHERENCE_STRONG'
  | 'NUTRITION_ADHERENCE_USABLE_NOT_STRONG'
  | 'NUTRITION_ADHERENCE_INSUFFICIENT'
  | 'NUTRITION_COVERAGE_INSUFFICIENT'
  | 'WEIGHT_DATA_SUFFICIENT'
  | 'WEIGHT_DATA_INSUFFICIENT'
  | 'TARGET_LOSS_RATE_MISSING'
  | 'PACE_VERY_SLOW_LT_50'
  | 'PACE_SLOW_50_TO_74'
  | 'PACE_ON_TARGET_75_TO_125'
  | 'PACE_FAST_GT_125'
  | 'WAIST_PROGRESS_PRESENT'
  | 'NO_MEANINGFUL_WAIST_PROGRESS'
  | 'WAIST_DATA_UNAVAILABLE'
  | 'BODY_FAT_PROGRESS_SUPPORTING'
  | 'DIET_FATIGUE_PRESENT'
  | 'DIET_FATIGUE_NOT_PRESENT'
  | 'RECOVERY_CONCERN_PRESENT'
  | 'RECOVERY_CONCERN_NOT_PRESENT'
  | 'CARDIO_TARGET_MET'
  | 'CARDIO_TARGET_NOT_MET'
  | 'CARDIO_LADDER_60_TO_75'
  | 'CARDIO_LADDER_75_TO_90'
  | 'CARDIO_INTENSITY_CAN_PROGRESS'
  | 'CARDIO_ALREADY_ADDRESSED'
  | 'CARDIO_TARGET_NOT_ON_POLICY_LADDER'
  | 'MACRO_ADJUSTMENT_AVAILABLE'
  | 'MACRO_ADJUSTMENT_BLOCKED'
  | 'RESET_DEFICIT_DURATION_MET'
  | 'RESET_DEFICIT_DURATION_NOT_MET'
  | 'RESET_PRIOR_REDUCTIONS_MET'
  | 'RESET_PRIOR_REDUCTIONS_NOT_MET'
  | 'RESET_CARDIO_ADDRESSED'
  | 'RESET_CARDIO_NOT_ADDRESSED'
  | 'RESET_THREE_WEEK_PLATEAU_MET'
  | 'RESET_THREE_WEEK_PLATEAU_NOT_MET'
  | 'RESET_DIET_FATIGUE_MET'
  | 'RESET_DIET_FATIGUE_NOT_MET'
  | 'RESET_ELIGIBLE'
  | 'RESET_WATCH'

export interface PolicyPrescription {
  calorie_target: number | null
  protein_grams: number | null
  carb_grams: number | null
  fat_grams: number | null
  weekly_cardio_target_minutes: number
  cardio_intensity_target: CardioIntensityTarget | null
  weekly_workout_target?: number | null
  daily_water_goal_oz?: number | null
  nutrition_ownership: NutritionOwnership
}

export interface PolicyWeekEvidence {
  week_number: number
  average_weight_lbs: number | null
  weight_readings: number
  nutrition_adherence_percent: number | null
  nutrition_coverage_percent: number | null
  waist_inches: number | null
  body_fat_percent?: number | null
  body_fat_source?:
    | 'scale'
    | 'juntos_estimate'
    | 'none'
    | null
  average_hunger_score?: number | null
  sleep_quality?: number | null
  energy_level?: number | null
  recovery_score?: number | null
  stress_level?: number | null
  cardio_minutes: number
}

export interface PolicyHistorySummary {
  full_weeks_under_current_prescription: number
  continuous_deficit_weeks: number | null
  prior_calorie_reductions: number
}

export interface DeterministicPolicyInput {
  completed_week_number: number
  goal: CoachingGoal
  target_loss_rate_pct_per_week: number | null
  macro_distribution_preference:
    MacroDistributionPreference
  current_prescription: PolicyPrescription
  current_week: PolicyWeekEvidence
  previous_week: PolicyWeekEvidence | null
  recent_weeks: PolicyWeekEvidence[]
  history: PolicyHistorySummary
  minimum_fat_grams?: number | null
}

export interface WeightPaceMetrics {
  weekly_change_lbs: number | null
  actual_loss_lbs: number | null
  target_loss_lbs: number | null
  pace_percent_of_target: number | null
}

export interface PolicySignals {
  data_confidence: PolicyDataConfidence
  weight_pace: WeightPaceMetrics
  waist_change_inches: number | null
  meaningful_waist_progress: boolean
  body_fat_change_points: number | null
  body_fat_progress_supporting: boolean
  diet_fatigue: boolean
  recovery_concern: boolean
  cardio_completion_percent: number | null
  cardio_target_met: boolean
  cardio_addressed: boolean
}

export interface PolicyActionCandidate {
  action_id: PolicyActionId
  category: PolicyActionCategory
  decision_type: 'hold' | 'recommend_change'
  legal: boolean
  reason_codes: PolicyReasonCode[]
  blocker_codes: PolicyReasonCode[]
  proposed_prescription: PolicyPrescription | null
}

export interface CalorieResetEvaluation {
  status: CalorieResetStatus
  criteria: {
    continuous_deficit_weeks: boolean
    prior_calorie_reductions: boolean
    cardio_addressed: boolean
    three_week_plateau: boolean
    diet_fatigue: boolean
  }
  reason_codes: PolicyReasonCode[]
}

export interface DeterministicPolicyResult {
  policy_version: string
  contract_version: string
  rules_version: string
  completed_week_number: number
  signals: PolicySignals
  calorie_reset: CalorieResetEvaluation
  legal_actions: PolicyActionCandidate[]
  blocked_actions: PolicyActionCandidate[]
  constraints: string[]
}
