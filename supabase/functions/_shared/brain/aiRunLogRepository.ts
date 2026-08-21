export async function startAiRun({
  admin,
  userId,
  coachingPlanId,
  weeklyCheckInId,
  weeklyCoachReviewId,
  runType,
  policy,
  protocolVersion,
  inputHash,
  inputSnapshot,
}: {
  admin: any
  userId: string
  coachingPlanId: string
  weeklyCheckInId: string
  weeklyCoachReviewId?: string | null
  runType: string
  policy?: any
  protocolVersion?: string | null
  inputHash?: string | null
  inputSnapshot?: any
}) {
  const { data, error } = await admin
    .from('ai_run_logs')
    .insert({
      user_id: userId,
      coaching_plan_id: coachingPlanId,
      weekly_checkin_id: weeklyCheckInId,
      weekly_coach_review_id:
        weeklyCoachReviewId ?? null,
      run_type: runType,
      status: 'running',
      policy_version:
        policy?.policy_version ?? null,
      protocol_version:
        protocolVersion ?? null,
      rules_version:
        policy?.rules_version ?? null,
      contract_version:
        policy?.contract_version ?? null,
      input_hash: inputHash ?? null,
      input_snapshot: inputSnapshot ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function finishAiRun({
  admin,
  runId,
  status,
  proposalId,
  aiMeta,
  outputSnapshot,
  errorCode,
  errorMessage,
}: {
  admin: any
  runId: string
  status:
    | 'succeeded'
    | 'failed'
    | 'invalid_response'
    | 'cancelled'
  proposalId?: string | null
  aiMeta?: any
  outputSnapshot?: any
  errorCode?: string | null
  errorMessage?: string | null
}) {
  const row = {
    status,
    proposal_id: proposalId ?? null,
    model: aiMeta?.model ?? null,
    reasoning_effort:
      aiMeta?.reasoning_effort ?? null,
    output_snapshot:
      outputSnapshot ?? null,
    openai_response_id:
      aiMeta?.response_id ?? null,
    error_code: errorCode ?? null,
    error_message: errorMessage ?? null,
    input_tokens:
      aiMeta?.input_tokens ?? null,
    output_tokens:
      aiMeta?.output_tokens ?? null,
    total_tokens:
      aiMeta?.total_tokens ?? null,
    completed_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from('ai_run_logs')
    .update(row)
    .eq('id', runId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}
