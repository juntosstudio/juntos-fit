export async function loadCoachReview(
  admin: any,
  weeklyCheckInId: string,
) {
  const { data, error } = await admin
    .from('weekly_coach_reviews')
    .select('*')
    .eq(
      'weekly_checkin_id',
      weeklyCheckInId,
    )
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ?? null
}

export async function saveCoachReview({
  admin,
  existing,
  weeklyCheckIn,
  protocolVersion,
  rulesVersion,
  inputHash,
  inputSnapshot,
  review,
  aiMeta,
  userId,
}: {
  admin: any
  existing: any
  weeklyCheckIn: any
  protocolVersion: string
  rulesVersion: string
  inputHash: string
  inputSnapshot: any
  review: any
  aiMeta: any
  userId: string
}) {
  const now = new Date().toISOString()

  const row = {
    id: existing?.id,
    user_id: userId,
    coaching_plan_id:
      weeklyCheckIn.coaching_plan_id,
    weekly_checkin_id:
      weeklyCheckIn.id,
    status: 'completed',
    protocol_version: protocolVersion,
    rules_version: rulesVersion,
    model: aiMeta.model,
    reasoning_effort:
      aiMeta.reasoning_effort,
    assessment: review.assessment,
    confidence: review.confidence,
    how_your_week_went:
      review.how_your_week_went,
    what_im_seeing:
      review.what_im_seeing,
    this_weeks_focus:
      review.this_weeks_focus,
    watch_items: review.watch_items,
    prescription_action:
      review.prescription_action,
    input_hash: inputHash,
    input_snapshot: inputSnapshot,
    openai_response_id:
      aiMeta.response_id,
    input_tokens: aiMeta.input_tokens,
    output_tokens: aiMeta.output_tokens,
    total_tokens: aiMeta.total_tokens,
    generation_count:
      Number(existing?.generation_count ?? 0) + 1,
    generated_at: now,
    updated_at: now,
  }

  const { data, error } = await admin
    .from('weekly_coach_reviews')
    .upsert(row, {
      onConflict: 'weekly_checkin_id',
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}
