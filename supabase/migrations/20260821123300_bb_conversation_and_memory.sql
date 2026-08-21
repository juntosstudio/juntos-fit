/*
======================================================
20260821123300_bb_conversation_and_memory.sql

Purpose:
    Adds append-only Plan Adjustment conversation
    messages and durable coaching memory that can span
    finite coaching plans.
======================================================
*/

begin;
/******************************************************************************
    6. Proposal / adjustment discussion messages
******************************************************************************/

create table if not exists
public.coaching_adjustment_messages (

    id uuid primary key
        default gen_random_uuid(),

    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    weekly_checkin_id uuid not null
        references public.weekly_checkins(id)
        on delete cascade,

    proposal_id uuid
        references public.coaching_adjustment_proposals(id)
        on delete set null,

    role text not null,

    content text not null,

    created_at timestamptz not null
        default now(),

    constraint
        coaching_adjustment_messages_role_valid
        check (
            role in (
                'user',
                'coach',
                'system'
            )
        ),

    constraint
        coaching_adjustment_messages_content_present
        check (length(btrim(content)) > 0)
);

create index if not exists
    coaching_adjustment_messages_week_created_idx
on public.coaching_adjustment_messages (
    weekly_checkin_id,
    created_at,
    id
);

create index if not exists
    coaching_adjustment_messages_proposal_idx
on public.coaching_adjustment_messages (
    proposal_id,
    created_at
)
where proposal_id is not null;

create or replace function
public.validate_coaching_adjustment_message_links()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if not exists (
        select 1
        from public.weekly_checkins as weekly
        where weekly.id = new.weekly_checkin_id
          and weekly.coaching_plan_id = new.coaching_plan_id
    ) then
        raise exception
            'Adjustment message Weekly Check-In must belong to the same coaching plan.';
    end if;

    if new.proposal_id is not null
       and not exists (
           select 1
           from public.coaching_adjustment_proposals as proposal
           where proposal.id = new.proposal_id
             and proposal.weekly_checkin_id = new.weekly_checkin_id
             and proposal.coaching_plan_id = new.coaching_plan_id
       ) then
        raise exception
            'Adjustment message proposal must belong to the same Weekly Check-In and coaching plan.';
    end if;

    return new;
end;
$$;

drop trigger if exists
    coaching_adjustment_messages_validate_links
on public.coaching_adjustment_messages;

create trigger
    coaching_adjustment_messages_validate_links
before insert
on public.coaching_adjustment_messages
for each row
execute function
    public.validate_coaching_adjustment_message_links();

alter table public.coaching_adjustment_messages
    enable row level security;

create policy
    "Users can view their own coaching adjustment messages"
on public.coaching_adjustment_messages
for select
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans as plan
        where plan.id = coaching_plan_id
          and plan.user_id =
              (select auth.uid())
    )
);

-- User-authored free text may be inserted directly. Coach/system
-- messages remain server-side only.
create policy
    "Users can create their own coaching adjustment messages"
on public.coaching_adjustment_messages
for insert
to authenticated
with check (
    role = 'user'
    and exists (
        select 1
        from public.coaching_plans as plan
        where plan.id = coaching_plan_id
          and plan.user_id =
              (select auth.uid())
    )
    and exists (
        select 1
        from public.weekly_checkins as weekly
        where weekly.id = weekly_checkin_id
          and weekly.coaching_plan_id =
              coaching_plan_id
    )
    and (
        proposal_id is null
        or exists (
            select 1
            from public.coaching_adjustment_proposals as proposal
            where proposal.id = proposal_id
              and proposal.coaching_plan_id = coaching_plan_id
              and proposal.weekly_checkin_id = weekly_checkin_id
        )
    )
);

comment on table
    public.coaching_adjustment_messages
is 'Append-only user/coach/system messages for the resumable Plan Adjustment conversation. Messages may optionally point at the proposal revision being discussed.';

/******************************************************************************
    7. Durable coaching memory
******************************************************************************/

create table if not exists
public.coaching_memory_entries (

    id uuid primary key
        default gen_random_uuid(),

    -- Memory may span plans, so user_id is authoritative here.
    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    coaching_plan_id uuid
        references public.coaching_plans(id)
        on delete set null,

    source_weekly_checkin_id uuid
        references public.weekly_checkins(id)
        on delete set null,

    source_proposal_id uuid
        references public.coaching_adjustment_proposals(id)
        on delete set null,

    supersedes_memory_id uuid
        references public.coaching_memory_entries(id)
        on delete set null,

    memory_type text not null,

    -- Optional stable key for preferences/facts that may be superseded.
    memory_key text,

    content text not null,

    structured_data jsonb not null
        default '{}'::jsonb,

    effective_at timestamptz not null
        default now(),

    expires_at timestamptz,

    created_by text not null
        default 'big_brain',

    created_at timestamptz not null
        default now(),

    constraint
        coaching_memory_entries_content_present
        check (length(btrim(content)) > 0),

    constraint
        coaching_memory_entries_expiry_valid
        check (
            expires_at is null
            or expires_at > effective_at
        )
);

create index if not exists
    coaching_memory_entries_user_type_effective_idx
on public.coaching_memory_entries (
    user_id,
    memory_type,
    effective_at desc
);

create index if not exists
    coaching_memory_entries_plan_effective_idx
on public.coaching_memory_entries (
    coaching_plan_id,
    effective_at desc
)
where coaching_plan_id is not null;

create index if not exists
    coaching_memory_entries_user_key_idx
on public.coaching_memory_entries (
    user_id,
    memory_key,
    effective_at desc
)
where memory_key is not null;

create or replace function
public.validate_coaching_memory_links()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.coaching_plan_id is not null
       and not exists (
           select 1
           from public.coaching_plans as plan
           where plan.id = new.coaching_plan_id
             and plan.user_id = new.user_id
       ) then
        raise exception
            'Coaching memory plan must belong to the same user.';
    end if;

    if new.source_weekly_checkin_id is not null
       and not exists (
           select 1
           from public.weekly_checkins as weekly
           join public.coaching_plans as plan
             on plan.id = weekly.coaching_plan_id
           where weekly.id = new.source_weekly_checkin_id
             and plan.user_id = new.user_id
       ) then
        raise exception
            'Coaching memory Weekly source must belong to the same user.';
    end if;

    if new.source_proposal_id is not null
       and not exists (
           select 1
           from public.coaching_adjustment_proposals as proposal
           join public.coaching_plans as plan
             on plan.id = proposal.coaching_plan_id
           where proposal.id = new.source_proposal_id
             and plan.user_id = new.user_id
       ) then
        raise exception
            'Coaching memory proposal source must belong to the same user.';
    end if;

    if new.supersedes_memory_id is not null
       and not exists (
           select 1
           from public.coaching_memory_entries as prior
           where prior.id = new.supersedes_memory_id
             and prior.user_id = new.user_id
             and prior.id <> new.id
       ) then
        raise exception
            'Superseded coaching memory must belong to the same user.';
    end if;

    return new;
end;
$$;

drop trigger if exists
    coaching_memory_entries_validate_links
on public.coaching_memory_entries;

create trigger
    coaching_memory_entries_validate_links
before insert
on public.coaching_memory_entries
for each row
execute function
    public.validate_coaching_memory_links();

alter table public.coaching_memory_entries
    enable row level security;

create policy
    "Users can view their own coaching memory"
on public.coaching_memory_entries
for select
to authenticated
using (
    user_id = (select auth.uid())
);

comment on table
    public.coaching_memory_entries
is 'Append-only durable coaching memory used across Weekly reviews and across finite coaching plans. Canonical raw outcomes remain in check-ins/proposals/prescriptions; memory stores compact coaching interpretation and durable context.';


grant select, insert
on table public.coaching_adjustment_messages
to authenticated;

revoke update, delete
on table public.coaching_adjustment_messages
from authenticated;

grant select
on table public.coaching_memory_entries
to authenticated;

revoke insert, update, delete
on table public.coaching_memory_entries
from authenticated;

revoke all
on table
    public.coaching_adjustment_messages,
    public.coaching_memory_entries
from anon;

grant select, insert
on table
    public.coaching_adjustment_messages,
    public.coaching_memory_entries
to service_role;

commit;
