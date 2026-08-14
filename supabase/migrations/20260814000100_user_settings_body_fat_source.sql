/*
======================================================
20260814000100_user_settings_body_fat_source.sql

Purpose:
    Adds the live body-fat tracking preference to
    user_settings so future Weekly Check-Ins can use
    the current user choice without rewriting history.
======================================================
*/

alter table public.user_settings
    add column if not exists body_fat_source text;

update public.user_settings as settings
set body_fat_source = plans.body_fat_source
from public.coaching_plans as plans
where settings.user_id = plans.user_id
  and plans.status = 'active'
  and settings.body_fat_source is null
  and plans.body_fat_source in (
      'scale',
      'juntos_estimate',
      'none'
  );

update public.user_settings
set body_fat_source = 'none'
where body_fat_source is null;

alter table public.user_settings
    alter column body_fat_source
    set default 'none';

alter table public.user_settings
    alter column body_fat_source
    set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname =
            'user_settings_body_fat_source_valid'
          and conrelid =
            'public.user_settings'::regclass
    ) then
        alter table public.user_settings
            add constraint
                user_settings_body_fat_source_valid
            check (
                body_fat_source in (
                    'scale',
                    'juntos_estimate',
                    'none'
                )
            );
    end if;
end
$$;

comment on column public.user_settings.body_fat_source
is 'Live body-fat tracking choice used by future check-ins. Historical check-in values retain their saved method/source.';
