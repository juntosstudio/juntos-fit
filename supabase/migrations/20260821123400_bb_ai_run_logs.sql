/*
======================================================
20260821123400_bb_ai_run_logs.sql

Purpose:
    Adds retained per-attempt Big Brain / AI execution
    logs for success, validation failure, timeout/error,
    and admin observability. Canonical user-facing
    Coach Reviews remain in weekly_coach_reviews.
======================================================
*/

begin;
/******************************************************************************
    8. AI / admin run logs
******************************************************************************/

create table if not exists
public.ai_run_logs (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    coaching_plan_id uuid
        references public.coaching_plans(id)
        on delete set null,

    weekly_checkin_id uuid
        references public.weekly_checkins(id)
        on delete set null,

    weekly_coach_review_id uuid
        references public.weekly_coach_reviews(id)
        on delete set null,

    proposal_id uuid
        references public.coaching_adjustment_proposals(id)
        on delete set null,

    run_type text not null,

    status text not null
        default 'running',

    policy_version text,
    protocol_version text,
    rules_version text,
    contract_version text,

    model text,
    reasoning_effort text,

    input_hash text,
    input_snapshot jsonb,
    output_snapshot jsonb,

    openai_response_id text,

    error_code text,
    error_message text,

    input_tokens integer,
    output_tokens integer,
    total_tokens integer,

    started_at timestamptz not null
        default now(),

    completed_at timestamptz,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint
        ai_run_logs_status_valid
        check (
            status in (
                'running',
                'succeeded',
                'failed',
                'invalid_response',
                'cancelled'
            )
        ),

    constraint
        ai_run_logs_token_counts_valid
        check (
            coalesce(input_tokens, 0) >= 0
            and coalesce(output_tokens, 0) >= 0
            and coalesce(total_tokens, 0) >= 0
        ),

    constraint
        ai_run_logs_completion_consistent
        check (
            (
                status = 'running'
                and completed_at is null
            )
            or (
                status <> 'running'
                and completed_at is not null
            )
        )
);

create index if not exists
    ai_run_logs_user_created_idx
on public.ai_run_logs (
    user_id,
    created_at desc
);

create index if not exists
    ai_run_logs_plan_created_idx
on public.ai_run_logs (
    coaching_plan_id,
    created_at desc
)
where coaching_plan_id is not null;

create index if not exists
    ai_run_logs_week_created_idx
on public.ai_run_logs (
    weekly_checkin_id,
    created_at desc
)
where weekly_checkin_id is not null;

create index if not exists
    ai_run_logs_status_started_idx
on public.ai_run_logs (
    status,
    started_at desc
);

alter table public.ai_run_logs
    enable row level security;

-- Intentionally no authenticated-user policy. These are internal
-- operational/admin records, not user-facing coaching content.

create trigger
    ai_run_logs_set_updated_at
before update
on public.ai_run_logs
for each row
execute function public.set_updated_at();

comment on table
    public.ai_run_logs
is 'One retained row per BB/AI execution attempt. Captures successful, failed, invalid, and abandoned/running attempts separately from the canonical user-facing Weekly Coach Review.';


revoke all
on table public.ai_run_logs
from anon, authenticated;

grant select, insert, update
on table public.ai_run_logs
to service_role;

commit;
