import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  isAdjustmentResolution,
  resolveAdjustmentProposal,
} from '../_shared/brain/adjustmentResolutionRepository.ts'
import { buildCoachingPacket } from '../_shared/brain/coachingPacket.ts'
import { evaluateDeterministicPolicy } from '../_shared/brain/policyEngine.ts'
import { buildDeterministicPolicyInput } from '../_shared/brain/policyInputAdapter.ts'
import { proposalMatchesPolicyAction } from '../_shared/brain/proposalPolicyMatch.ts'

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
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function conflictMessage(error: unknown) {
  const message = String(
    (error as any)?.message ?? error ?? '',
  )

  return /already accepted|already declined|newer plan adjustment revision|no longer open/i.test(
    message,
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
    const proposalId = String(
      body?.proposal_id ?? '',
    ).trim()
    const resolution = String(
      body?.resolution ?? '',
    ).trim()

    if (!isUuid(proposalId)) {
      return jsonResponse(
        {
          error:
            'proposal_id must be a valid UUID.',
        },
        400,
      )
    }

    if (!isAdjustmentResolution(resolution)) {
      return jsonResponse(
        {
          error:
            'resolution must be accept or decline.',
        },
        400,
      )
    }

    // RLS is the ownership gate. A proposal that does not belong to
    // this authenticated user is intentionally indistinguishable from
    // one that does not exist.
    const {
      data: ownedProposal,
      error: proposalError,
    } = await userClient
      .from('coaching_adjustment_proposals')
      .select('*')
      .eq('id', proposalId)
      .maybeSingle()

    if (proposalError) {
      throw proposalError
    }

    if (!ownedProposal) {
      return jsonResponse(
        { error: 'Plan Adjustment not found.' },
        404,
      )
    }

    // Decline never needs coaching-policy approval. Same-resolution
    // retries also return the already-committed database result. Only
    // a still-open acceptance crosses the final live-policy gate.
    if (
      resolution === 'accept' &&
      ownedProposal.status === 'proposed'
    ) {
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
        .eq(
          'id',
          ownedProposal.weekly_checkin_id,
        )
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

      if (weeklyCheckIn.status !== 'completed') {
        return jsonResponse(
          {
            error:
              'Complete the Weekly Check-In before accepting Plan Adjustment.',
          },
          409,
        )
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
      const currentAction =
        policy.legal_actions.find(
          (action) =>
            action.legal &&
            action.action_id ===
              ownedProposal.action_id,
        ) ?? null

      if (
        !proposalMatchesPolicyAction(
          ownedProposal,
          currentAction,
        )
      ) {
        return jsonResponse(
          {
            error:
              'This Plan Adjustment no longer exactly matches current deterministic policy. Review the adjustment again before accepting it.',
            stale_policy: true,
          },
          409,
        )
      }
    }

    const result =
      await resolveAdjustmentProposal({
        admin,
        proposalId,
        resolution,
      })

    if (
      result.outcome === 'expired' ||
      result.outcome === 'stale'
    ) {
      return jsonResponse(
        {
          error:
            result.outcome === 'expired'
              ? 'This Plan Adjustment expired before it was accepted.'
              : 'Your prescription changed after this Plan Adjustment was created. It was not applied.',
          ...result,
        },
        409,
      )
    }

    return jsonResponse(result)
  } catch (error) {
    console.error(
      '[resolve-plan-adjustment] failed',
      error,
    )

    if (conflictMessage(error)) {
      return jsonResponse(
        {
          error: String(
            (error as any)?.message ?? error,
          ),
        },
        409,
      )
    }

    return jsonResponse(
      {
        error:
          'Juntos Coach could not resolve this Plan Adjustment right now.',
      },
      500,
    )
  }
})
