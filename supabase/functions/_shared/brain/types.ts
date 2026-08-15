export type CoachAssessment =
  | 'on_track'
  | 'watch'
  | 'needs_attention'

export type DataConfidence =
  | 'high'
  | 'medium'
  | 'low'

export type PrescriptionAction = 'hold'

export interface CoachReviewOutput {
  assessment: CoachAssessment
  confidence: DataConfidence
  how_your_week_went: string
  what_im_seeing: string
  this_weeks_focus: string[]
  watch_items: string[]
  prescription_action: PrescriptionAction
}

export interface CoachingProtocol {
  version: string
  name: string
  purpose: string
  principles: string[]
  tone: string[]
}

export interface HardRulesResult {
  version: string
  data_confidence: DataConfidence
  prescription_actions_allowed: PrescriptionAction[]
  constraints: string[]
}

export interface MemoryContext {
  provider_version: string
  relationship_memory: unknown[]
  active_context: unknown[]
  recent_context: unknown[]
}
