import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  finalizeAdjustmentConversationTurn,
  ensureUserAdjustmentMessage,
  loadAdjustmentConversation,
  loadAdjustmentProposalById,
  loadCoachReplyForUserMessage,
  toPublicAdjustmentMessage,
} from '../_shared/brain/adjustmentConversationRepository.ts'
import { buildAdjustmentConversationContext } from '../_shared/brain/conversationContext.ts'
import { runAdjustmentConversationTurn } from '../_shared/brain/conversationProvider.ts'
import { ADJUSTMENT_CONVERSATION_PROTOCOL } from '../_shared/brain/conversationProtocol.ts'
import {
  finishAiRun,
  startAiRun,
} from '../_shared/brain/aiRunLogRepository.ts'
import { buildCoachingPacket } from '../_shared/brain/coachingPacket.ts'
import { loadRelevantMemory } from '../_shared/brain/memoryProvider.ts'
import {
  expireOpenAdjustmentProposalIfNeeded,
  loadLatestAdjustmentProposal,
  toPublicAdjustmentProposal,
} from '../_shared/brain/planAdjustmentRepository.ts'
import { evaluateDeterministicPolicy } from '../_shared/brain/policyEngine.ts'
import { buildDeterministicPolicyInput } from '../_shared/brain/policyInputAdapter.ts'
import { loadCoachReview } from '../_shared/brain/reviewRepository.ts'
import { validateAdjustmentConversationTurn } from '../_shared/brain/validateAdjustmentConversation.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_USER_MESSAGE_LENGTH = 4000

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })
}

function parseKeyDictionary(environmentName: string) {
  const raw = Deno.env.get(environmentName)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getClientApiKey() {
  const publishable = parseKeyDictionary(
    'SUPABASE_PUBLISHABLE_KEYS',
  )

  return (
    publishable?.default ||
    Deno.env.get('SUPABASE_ANON_KEY') ||
    ''
  )
}

function getAdminApiKey() {
  const secret = parseKeyDictionary(
    'SUPABASE_SECRET_KEYS',
  )

  return (
    secret?.default ||
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    ''
  )
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    bytes,
  )

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function safeFinishRun(
  args: Parameters<typeof finishAiRun>[0],
) {
  try {
    await finishAiRun(args)
  } catch (error) {
    console.error(
      '[continue-plan-adjustment] failed to finalize AI run log',
      error,
    )
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: CORS_HEADERS,
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed.' },
      405,
    )
  }

  try {
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL') || ''
    const clientApiKey = getClientApiKey()
    const adminApiKey = getAdminApiKey()
    const authorization =
      req.headers.get('Authorization')

    if (
      !supabaseUrl ||
      !clientApiKey ||
      !adminApiKey
    ) {
      throw new Error(
        'Supabase function environment is not configured.',
      )
    }

    if (!authorization) {
      return jsonResponse(
        { error: 'Authentication required.' },
        401,
      )
    }

    const userClient = createClient(
      supabaseUrl,
      clientApiKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    )

    const admin = createClient(
      supabaseUrl,
      adminApiKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    )

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse(
        { error: 'Authentication required.' },
        401,
      )
    }

    const body = await req.json()
    const weeklyCheckInId = String(
      body?.weekly_checkin_id ?? '',
    ).trim()
    const message = String(
      body?.message ?? '',
    ).trim()
    const clientMessageId = String(
      body?.client_message_id ?? '',
    ).trim()

    if (!weeklyCheckInId) {
      return jsonResponse(
        { error: 'weekly_checkin_id is required.' },
        400,
      )
    }

    if (!message) {
      return jsonResponse(
        { error: 'A message is required.' },
        400,
      )
    }

    if (message.length > MAX_USER_MESSAGE_LENGTH) {
      return jsonResponse(
        {
          error:
            'That message is too long. Please shorten it and try again.',
        },
        400,
      )
    }

    if (!isUuid(clientMessageId)) {
      return jsonResponse(
        {
          error:
            'client_message_id must be a valid UUID.',
        },
        400,
      )
    }

    const {
      data: weeklyCheckIn,
      error: weeklyError,
    } = await userClient
      .from('weekly_checkins')
      .select(`
        id,
        coaching_plan_id,
        checkin_date,
        week_number,
        status,
        submitted_at,
        updated_at,
        waist,
        body_fat_percent,
        body_fat_source,
        body_fat_method,
        sleep_quality,
        energy_level,
        recovery_score,
        stress_level,
        menstrual_cycle_context,
        weekly_reflection,
        questions_for_coach,
        nutrition_adherence_percent,
        nutrition_adherence_days_reported,
        nutrition_adherence_expected_days,
        nutrition_adherence_coverage_percent,
        nutrition_adherence_policy_version
      `)
      .eq('id', weeklyCheckInId)
      .maybeSingle()

    if (weeklyError) {
      throw weeklyError
    }

    if (!weeklyCheckIn) {
      return jsonResponse(
        { error: 'Weekly Check-In not found.' },
        404,
      )
    }

    const {
      data: ownerPlan,
      error: ownerPlanError,
    } = await admin
      .from('coaching_plans')
      .select('id, user_id')
      .eq('id', weeklyCheckIn.coaching_plan_id)
      .maybeSingle()

    if (ownerPlanError) {
      throw ownerPlanError
    }

    if (!ownerPlan || ownerPlan.user_id !== user.id) {
      return jsonResponse(
        { error: 'Weekly Check-In not found.' },
        404,
      )
    }

    if (weeklyCheckIn.status !== 'completed') {
      return jsonResponse(
        {
          error:
            'Complete the Weekly Check-In before discussing Plan Adjustment.',
        },
        409,
      )
    }

    const coachReview = await loadCoachReview(
      admin,
      weeklyCheckIn.id,
    )

    if (coachReview?.status !== 'completed') {
      return jsonResponse(
        {
          error:
            'Complete the Coach Review before discussing Plan Adjustment.',
        },
        409,
      )
    }

    const loadedProposal =
      await loadLatestAdjustmentProposal(
        admin,
        weeklyCheckIn.id,
      )

    if (!loadedProposal) {
      return jsonResponse(
        {
          error:
            'Start Plan Adjustment before sending a message.',
        },
        409,
      )
    }

    const currentProposal =
      await expireOpenAdjustmentProposalIfNeeded({
        admin,
        proposal: loadedProposal,
        weeklyCheckIn,
      })

    if (currentProposal.status !== 'proposed') {
      return jsonResponse(
        {
          error:
            currentProposal.status === 'expired'
              ? 'The 24-hour Plan Adjustment window has closed. This coaching decision is now view-only.'
              : 'This Plan Adjustment is already resolved.',
          adjustment_expired:
            currentProposal.status === 'expired',
          proposal:
            toPublicAdjustmentProposal(
              currentProposal,
            ),
        },
        409,
      )
    }

    const userTurn =
      await ensureUserAdjustmentMessage({
        admin,
        currentProposal,
        content: message,
        clientMessageId,
      })

    // Network retry / double-click path. If this exact user message
    // already has a coach reply, return the committed turn for free.
    const existingReply =
      await loadCoachReplyForUserMessage(
        admin,
        userTurn.message.id,
      )

    if (existingReply) {
      const replyProposal = existingReply.proposal_id
        ? await loadAdjustmentProposalById(
            admin,
            existingReply.proposal_id,
          )
        : currentProposal

      return jsonResponse({
        proposal: toPublicAdjustmentProposal(
          replyProposal ?? currentProposal,
        ),
        message:
          toPublicAdjustmentMessage(existingReply),
        revised:
          Boolean(existingReply.proposal_id) &&
          String(existingReply.proposal_id) !==
            String(userTurn.message.proposal_id),
        cached: true,
      })
    }

    const packet = await buildCoachingPacket({
      admin,
      weeklyCheckIn,
    })
    const policyInput =
      buildDeterministicPolicyInput(packet)
    const policy = evaluateDeterministicPolicy(
      policyInput,
    )
    const memory = await loadRelevantMemory()
    const conversation =
      await loadAdjustmentConversation(
        admin,
        weeklyCheckIn.id,
      )

    const context =
      buildAdjustmentConversationContext({
        packet,
        coachReview,
        policy,
        currentProposal,
        proposals: conversation.proposals,
        messages: conversation.messages,
        memory,
      })

    const inputSnapshot = {
      context,
      protocol:
        ADJUSTMENT_CONVERSATION_PROTOCOL,
    }
    const inputHash = await sha256(
      JSON.stringify(inputSnapshot),
    )

    const aiRun = await startAiRun({
      admin,
      userId: ownerPlan.user_id,
      coachingPlanId:
        weeklyCheckIn.coaching_plan_id,
      weeklyCheckInId: weeklyCheckIn.id,
      weeklyCoachReviewId: coachReview.id,
      runType: 'plan_adjustment_conversation',
      policy,
      protocolVersion:
        ADJUSTMENT_CONVERSATION_PROTOCOL.version,
      inputHash,
      inputSnapshot,
    })

    const safetyIdentifier =
      `juntos_${(
        await sha256(`juntos:${user.id}`)
      ).slice(0, 32)}`

    let aiResult

    try {
      aiResult = await runAdjustmentConversationTurn({
        context,
        protocol:
          ADJUSTMENT_CONVERSATION_PROTOCOL,
        safetyIdentifier,
      })
    } catch (error) {
      await safeFinishRun({
        admin,
        runId: aiRun.id,
        status: 'failed',
        errorCode: 'AI_REQUEST_FAILED',
        errorMessage: String(
          (error as any)?.message ?? error,
        ),
      })

      throw error
    }

    let validated

    try {
      validated =
        validateAdjustmentConversationTurn(
          aiResult.turn,
          policy,
          currentProposal,
        )
    } catch (error) {
      await safeFinishRun({
        admin,
        runId: aiRun.id,
        status: 'invalid_response',
        aiMeta: aiResult.meta,
        outputSnapshot: aiResult.turn,
        errorCode: 'INVALID_CONVERSATION_TURN',
        errorMessage: String(
          (error as any)?.message ?? error,
        ),
      })

      throw error
    }

    let finalized

    try {
      finalized =
        await finalizeAdjustmentConversationTurn({
          admin,
          currentProposal,
          userMessage: userTurn.message,
          validatedTurn: validated,
          policy,
        })
    } catch (error) {
      await safeFinishRun({
        admin,
        runId: aiRun.id,
        status: 'failed',
        aiMeta: aiResult.meta,
        outputSnapshot: aiResult.turn,
        errorCode: 'TURN_SAVE_FAILED',
        errorMessage: String(
          (error as any)?.message ?? error,
        ),
      })

      throw error
    }

    await safeFinishRun({
      admin,
      runId: aiRun.id,
      status: 'succeeded',
      proposalId: finalized.proposal?.id ?? null,
      aiMeta: aiResult.meta,
      outputSnapshot: {
        raw_turn: aiResult.turn,
        should_revise:
          validated.should_revise,
        canonical_action:
          validated.selected_action,
      },
    })

    return jsonResponse({
      ...finalized,
      cached: Boolean(finalized.cached),
    })
  } catch (error) {
    console.error(
      '[continue-plan-adjustment]',
      error,
    )

    return jsonResponse(
      {
        error:
          'Juntos Coach could not continue the Plan Adjustment discussion right now. Your Weekly Check-In, Coach Review, and message are still saved.',
      },
      500,
    )
  }
})
