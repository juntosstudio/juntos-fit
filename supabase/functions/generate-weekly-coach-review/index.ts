import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildCoachingPacket } from '../_shared/brain/coachingPacket.ts'
import { evaluateHardRules } from '../_shared/brain/hardRules.ts'
import { WEEKLY_COACH_PROTOCOL } from '../_shared/brain/protocol.ts'
import { loadRelevantMemory } from '../_shared/brain/memoryProvider.ts'
import { runAiCoach } from '../_shared/brain/aiCoachProvider.ts'
import { validateCoachResponse } from '../_shared/brain/validateCoachResponse.ts'
import {
  loadCoachReview,
  saveCoachReview,
} from '../_shared/brain/reviewRepository.ts'

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
  const publishable =
    parseKeyDictionary(
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
    Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY',
    ) ||
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

function toPublicReview(row: any) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    user_id: row.user_id,
    coaching_plan_id:
      row.coaching_plan_id,
    weekly_checkin_id:
      row.weekly_checkin_id,
    status: row.status,
    protocol_version:
      row.protocol_version,
    rules_version: row.rules_version,
    model: row.model,
    reasoning_effort:
      row.reasoning_effort,
    assessment: row.assessment,
    confidence: row.confidence,
    how_your_week_went:
      row.how_your_week_went,
    what_im_seeing:
      row.what_im_seeing,
    this_weeks_focus:
      row.this_weeks_focus ?? [],
    watch_items: row.watch_items ?? [],
    prescription_action:
      row.prescription_action,
    input_hash: row.input_hash,
    generation_count:
      row.generation_count,
    generated_at: row.generated_at,
    finalized_at: row.finalized_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
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

    // Ownership is checked through the caller-scoped
    // client first. The admin client is only used after
    // this row is proven to belong to the signed-in user.
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
        questions_for_coach
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

    // weekly_checkins no longer stores user_id.
    // Resolve ownership through its coaching plan instead.
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

    // The function has already authenticated the caller
    // with userClient.auth.getUser(). Use the service-role
    // client for this server-side ownership lookup so the
    // Edge Function does not depend on direct SELECT grants
    // for authenticated users on coaching_plans.
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
            'Complete the Weekly Check-In before generating a Coach Review.',
        },
        409,
      )
    }

    const packet = await buildCoachingPacket({
      admin,
      weeklyCheckIn,
    })

    const hardRules =
      evaluateHardRules(packet)

    const memory =
      await loadRelevantMemory()

    const inputSnapshot = {
      packet,
      hard_rules: hardRules,
      protocol: WEEKLY_COACH_PROTOCOL,
      memory,
    }

    const inputHash = await sha256(
      JSON.stringify(inputSnapshot),
    )

    const existing = await loadCoachReview(
      admin,
      weeklyCheckIn.id,
    )

    // Opening Weekly Summary repeatedly is free. We only
    // call OpenAI when the actual Brain input changed.
    if (
      existing?.status === 'completed' &&
      existing?.input_hash === inputHash
    ) {
      return jsonResponse({
        review: toPublicReview(existing),
        cached: true,
      })
    }

    const safetyIdentifier =
      `juntos_${(
        await sha256(`juntos:${user.id}`)
      ).slice(0, 32)}`

    const aiResult = await runAiCoach({
      packet,
      hardRules,
      protocol: WEEKLY_COACH_PROTOCOL,
      memory,
      safetyIdentifier,
    })

    const validated =
      validateCoachResponse(
        aiResult.review,
        hardRules,
      )

    const saved = await saveCoachReview({
      admin,
      existing,
      weeklyCheckIn,
      protocolVersion:
        WEEKLY_COACH_PROTOCOL.version,
      rulesVersion: hardRules.version,
      inputHash,
      inputSnapshot,
      review: validated,
      aiMeta: aiResult.meta,
      userId: ownerPlan.user_id,
    })

    return jsonResponse({
      review: toPublicReview(saved),
      cached: false,
    })
  } catch (error) {
    console.error(
      '[generate-weekly-coach-review]',
      error,
    )

    return jsonResponse(
      {
        error:
          'Juntos Coach could not generate this review right now. Your Weekly Check-In is still saved.',
      },
      500,
    )
  }
})
