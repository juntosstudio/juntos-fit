import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildAdjustmentJudgmentContext } from '../_shared/brain/adjustmentJudgmentContext.ts'
import { runAdjustmentJudgment } from '../_shared/brain/adjustmentJudgmentProvider.ts'
import {
  finishAiRun,
  startAiRun,
} from '../_shared/brain/aiRunLogRepository.ts'
import { buildCoachingPacket } from '../_shared/brain/coachingPacket.ts'
import { ADJUSTMENT_JUDGMENT_PROTOCOL } from '../_shared/brain/judgmentProtocol.ts'
import { loadRelevantMemory } from '../_shared/brain/memoryProvider.ts'
import {
  createInitialAdjustmentProposal,
  loadLatestAdjustmentProposal,
  toPublicAdjustmentProposal,
} from '../_shared/brain/planAdjustmentRepository.ts'
import { evaluateDeterministicPolicy } from '../_shared/brain/policyEngine.ts'
import { buildDeterministicPolicyInput } from '../_shared/brain/policyInputAdapter.ts'
import { loadCoachReview } from '../_shared/brain/reviewRepository.ts'
import { validateAdjustmentJudgment } from '../_shared/brain/validateAdjustmentJudgment.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    },
  )
}

function parseKeyDictionary(
  environmentName: string,
) {
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

  return Array.from(
    new Uint8Array(hashBuffer),
  )
    .map((byte) =>
      byte.toString(16).padStart(2, '0'),
    )
    .join('')
}

async function safeFinishRun(
  args: Parameters<typeof finishAiRun>[0],
) {
  try {
    await finishAiRun(args)
  } catch (error) {
    console.error(
      '[generate-plan-adjustment] failed to finalize AI run log',
      error,
    )
  }
}

function isUniqueViolation(error: any) {
  return String(error?.code ?? '') === '23505'
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

    if (!weeklyCheckInId) {
      return jsonResponse(
        {
          error:
            'weekly_checkin_id is required.',
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
            'Complete the Weekly Check-In before starting Plan Adjustment.',
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
            'Complete the Coach Review before starting Plan Adjustment.',
        },
        409,
      )
    }

    // A proposal is a frozen coaching recommendation. Reopening Plan
    // Adjustment must never spend another AI call or silently rewrite
    // an existing revision. Conversation-driven revisions will use a
    // separate explicit path later.
    const existingProposal =
      await loadLatestAdjustmentProposal(
        admin,
        weeklyCheckIn.id,
      )

    if (existingProposal) {
      return jsonResponse({
        proposal:
          toPublicAdjustmentProposal(
            existingProposal,
          ),
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

    const judgmentContext =
      buildAdjustmentJudgmentContext({
        packet,
        coachReview,
        policy,
        memory,
      })

    const inputSnapshot = {
      context: judgmentContext,
      protocol: ADJUSTMENT_JUDGMENT_PROTOCOL,
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
      runType: 'plan_adjustment_judgment',
      policy,
      protocolVersion:
        ADJUSTMENT_JUDGMENT_PROTOCOL.version,
      inputHash,
      inputSnapshot,
    })

    const safetyIdentifier =
      `juntos_${(
        await sha256(`juntos:${user.id}`)
      ).slice(0, 32)}`

    let aiResult

    try {
      aiResult = await runAdjustmentJudgment({
        context: judgmentContext,
        protocol:
          ADJUSTMENT_JUDGMENT_PROTOCOL,
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
      validated = validateAdjustmentJudgment(
        aiResult.judgment,
        policy,
      )
    } catch (error) {
      await safeFinishRun({
        admin,
        runId: aiRun.id,
        status: 'invalid_response',
        aiMeta: aiResult.meta,
        outputSnapshot: aiResult.judgment,
        errorCode: 'INVALID_JUDGMENT',
        errorMessage: String(
          (error as any)?.message ?? error,
        ),
      })

      throw error
    }

    let proposal

    try {
      proposal = await createInitialAdjustmentProposal({
        admin,
        weeklyCheckIn,
        coachReview,
        packet,
        policy,
        judgment: validated,
      })
    } catch (error) {
      // Concurrent double-clicks can race after both callers pass the
      // initial read. The DB unique constraint remains authoritative;
      // if the other caller won, return that frozen proposal instead.
      if (isUniqueViolation(error)) {
        proposal = await loadLatestAdjustmentProposal(
          admin,
          weeklyCheckIn.id,
        )
      }

      if (!proposal) {
        await safeFinishRun({
          admin,
          runId: aiRun.id,
          status: 'failed',
          aiMeta: aiResult.meta,
          outputSnapshot: aiResult.judgment,
          errorCode: 'PROPOSAL_SAVE_FAILED',
          errorMessage: String(
            (error as any)?.message ?? error,
          ),
        })

        throw error
      }
    }

    await safeFinishRun({
      admin,
      runId: aiRun.id,
      status: 'succeeded',
      proposalId: proposal.id,
      aiMeta: aiResult.meta,
      outputSnapshot: {
        raw_judgment: aiResult.judgment,
        selected_action_id:
          validated.selected_action.action_id,
        canonical_action:
          validated.selected_action,
      },
    })

    return jsonResponse({
      proposal:
        toPublicAdjustmentProposal(proposal),
      cached: false,
    })
  } catch (error) {
    console.error(
      '[generate-plan-adjustment]',
      error,
    )

    return jsonResponse(
      {
        error:
          'Juntos Coach could not prepare your Plan Adjustment right now. Your Weekly Check-In and Coach Review are still saved.',
      },
      500,
    )
  }
})
