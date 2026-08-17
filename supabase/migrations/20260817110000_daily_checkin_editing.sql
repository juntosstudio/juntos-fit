/*
======================================================
20260817110000_daily_checkin_editing.sql

Purpose:
    Support editing completed Daily Check-Ins while
    their reporting week is still open, and freeze
    them after the closing Weekly Check-In is finalized.

Rules:
    - Existing Daily rows may be updated before the
      reporting week's completed Weekly Check-In exists.
    - Once a completed Weekly exists, the seven Daily
      reporting dates ending on that Weekly date are
      locked from insert/update.
    - edited_at is stamped quietly on Daily updates.
    - No delete behavior is added.

Reporting model:
    A completed Weekly on date D closes Daily reporting
    rows with checkin_date D-6 through D inclusive.
======================================================
*/

alter table public.daily_checkins
    add column if not exists edited_at timestamptz;

create or replace function
public.guard_daily_checkin_closed_week()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    source_plan_id uuid;
    source_checkin_date date;
begin
    /*
     * For UPDATE, protect the row based on its original
     * reporting date so a locked row cannot be moved to
     * another date/plan to evade the freeze.
     */
    if tg_op = 'UPDATE' then
        source_plan_id := old.coaching_plan_id;
        source_checkin_date := old.checkin_date;
    else
        source_plan_id := new.coaching_plan_id;
        source_checkin_date := new.checkin_date;
    end if;

    if exists (
        select 1
        from public.weekly_checkins as wc
        where wc.coaching_plan_id =
              source_plan_id
          and wc.status = 'completed'
          and source_checkin_date between
              (wc.checkin_date - 6)
              and wc.checkin_date
    ) then
        raise exception
            'This Daily Check-In is locked because its Weekly Check-In has been finalized.';
    end if;

    /*
     * Also protect a moved/retargeted UPDATE if its new
     * date would land inside a different closed week.
     */
    if tg_op = 'UPDATE'
       and (
           new.coaching_plan_id is distinct from
               old.coaching_plan_id
           or new.checkin_date is distinct from
               old.checkin_date
       )
       and exists (
           select 1
           from public.weekly_checkins as wc
           where wc.coaching_plan_id =
                 new.coaching_plan_id
             and wc.status = 'completed'
             and new.checkin_date between
                 (wc.checkin_date - 6)
                 and wc.checkin_date
       ) then
        raise exception
            'This Daily Check-In is locked because its Weekly Check-In has been finalized.';
    end if;

    if tg_op = 'UPDATE' then
        new.edited_at := now();
    end if;

    return new;
end;
$$;

drop trigger if exists
    daily_checkins_guard_closed_week
on public.daily_checkins;

create trigger
    daily_checkins_guard_closed_week
before insert or update
on public.daily_checkins
for each row
execute function
    public.guard_daily_checkin_closed_week();

comment on column public.daily_checkins.edited_at
is 'Timestamp of the most recent edit to an existing Daily Check-In.';
