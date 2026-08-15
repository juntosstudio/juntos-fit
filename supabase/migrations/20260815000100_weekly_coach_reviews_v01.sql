/*
======================================================
20260815000100_weekly_coach_reviews_v01.sql

Purpose:
    Stores one canonical Juntos Coach review for each
    completed Weekly Check-In.

Architecture:
    Weekly Check-In -> Coaching Packet -> Hard Rules ->
    Coaching Protocol -> Memory Provider -> AI Coach ->
    Validator -> Saved Coach Review.

Notes:
    - The browser may SELECT its own reviews only.
    - Client INSERT/UPDATE/DELETE access is revoked.
    - The Edge Function writes through a server-side
      secret after verifying Weekly Check-In ownership.
    - input_hash prevents duplicate OpenAI calls when
      the same review is opened repeatedly.
    - input_snapshot preserves exactly what the Brain
      evaluated for debugging/auditability.
======================================================
*/

create table public.weekly_coach_reviews (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    weekly_checkin_id uuid not null
        references public.weekly_checkins(id)
        on delete cascade,

    status text not null
        default 'completed',

    protocol_version text not null,
    rules_version text not null,

    model text not null,
    reasoning_effort text,

    assessment text not null,
    confidence text not null,

    how_your_week_went text not null,
    what_im_seeing text not null,

    this_weeks_focus jsonb not null
        default '[]'::jsonb,

    watch_items jsonb not null
        default '[]'::jsonb,

    prescription_action text not null,

    -- Hash of the complete evaluated Brain input.
    -- Same hash means the saved response can be reused
    -- without another paid AI call.
    input_hash text not null,

    -- Frozen input used for this coaching decision.
    input_snapshot jsonb not null,

    openai_response_id text,

    input_tokens integer,
    output_tokens integer,
    total_tokens integer,

    generation_count integer not null
        default 1,

    generated_at timestamptz not null
        default now(),

    -- Reserved for the same-day correction/finalization
    -- workflow already designed for Weekly Check-Ins.
    finalized_at timestamptz,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint weekly_coach_reviews_weekly_unique
        unique (weekly_checkin_id),

    constraint weekly_coach_reviews_status_valid
        check (
            status in (
                'completed',
                'stale',
                'failed'
            )
        ),

    constraint weekly_coach_reviews_assessment_valid
        check (
            assessment in (
                'on_track',
                'watch',
                'needs_attention'
            )
        ),

    constraint weekly_coach_reviews_confidence_valid
        check (
            confidence in (
                'high',
                'medium',
                'low'
            )
        ),

    -- Future-ready schema; v0.1 code still permits HOLD
    -- only and rejects every other action before save.
    constraint weekly_coach_reviews_action_valid
        check (
            prescription_action in (
                'hold',
                'change_recommended',
                'insufficient_data'
            )
        ),

    constraint weekly_coach_reviews_generation_count_valid
        check (generation_count > 0),

    constraint weekly_coach_reviews_token_counts_valid
        check (
            coalesce(input_tokens, 0) >= 0
            and coalesce(output_tokens, 0) >= 0
            and coalesce(total_tokens, 0) >= 0
        )
);

create index
    weekly_coach_reviews_plan_generated_idx
on public.weekly_coach_reviews (
    coaching_plan_id,
    generated_at desc
);

/******************************************************************************
    Row Level Security
******************************************************************************/

alter table public.weekly_coach_reviews
    enable row level security;

create policy
    "Users can view their own weekly coach reviews"
on public.weekly_coach_reviews
for select
to authenticated
using (
    user_id = (select auth.uid())
);

/******************************************************************************
    Browser authority
******************************************************************************/

-- Reviews are generated and written server-side only.
-- Authenticated clients can read their own row through
-- RLS, but cannot forge or rewrite a coaching decision.
revoke insert, update, delete
on table public.weekly_coach_reviews
from authenticated;

revoke all
on table public.weekly_coach_reviews
from anon;

grant select
on table public.weekly_coach_reviews
to authenticated;
