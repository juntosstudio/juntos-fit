/*
======================================================
20260720000300_progress_photos.sql

Purpose:
    Creates private photo storage and metadata for
    standardized Start Check-In and future weekly
    progress photos.

Relationships:
    coaching_plans  (1) ---- (*) progress_photos
    start_checkins  (1) ---- (0..3) progress_photos
    weekly_checkins (1) ---- (0..3) progress_photos

Storage path:
    <user_id>/<coaching_plan_id>/<context>/<checkin_id>/<pose>.<extension>

Notes:
    The progress-photos bucket is private.

    Each check-in may contain one front, one side,
    and one back photo.

    The selected side view is stored and validated
    so later comparison photos use the same side.

Author:
    Deborah Reyna

Created:
    2026-07-20
======================================================
*/

/******************************************************************************
    Private Storage Bucket
******************************************************************************/

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'progress-photos',
    'progress-photos',
    false,
    15728640,
    array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif'
    ]
)
on conflict (id) do update
set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types =
        excluded.allowed_mime_types;

/******************************************************************************
    Progress Photo Metadata
******************************************************************************/

create table public.progress_photos (

    id uuid primary key
        default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    -- Exactly one parent check-in is supplied.
    start_checkin_id uuid
        references public.start_checkins(id)
        on delete cascade,

    weekly_checkin_id uuid
        references public.weekly_checkins(id)
        on delete cascade,

    photo_context text not null,

    pose text not null,

    -- Used only when pose is side.
    side_view text,

    -- Object name inside the private bucket.
    storage_path text not null
        unique,

    mime_type text,

    size_bytes bigint,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint progress_photos_context_valid
        check (
            photo_context in (
                'start',
                'weekly'
            )
        ),

    constraint progress_photos_pose_valid
        check (
            pose in (
                'front',
                'side',
                'back'
            )
        ),

    constraint progress_photos_parent_valid
        check (
            (
                photo_context = 'start'
                and start_checkin_id is not null
                and weekly_checkin_id is null
            )
            or
            (
                photo_context = 'weekly'
                and weekly_checkin_id is not null
                and start_checkin_id is null
            )
        ),

    constraint progress_photos_side_view_valid
        check (
            (
                pose = 'side'
                and side_view in (
                    'left',
                    'right'
                )
            )
            or
            (
                pose <> 'side'
                and side_view is null
            )
        ),

    constraint progress_photos_size_positive
        check (
            size_bytes is null
            or size_bytes > 0
        )

);

/******************************************************************************
    Indexes
******************************************************************************/

create unique index
    progress_photos_start_pose_unique
on public.progress_photos (
    start_checkin_id,
    pose
)
where start_checkin_id is not null;

create unique index
    progress_photos_weekly_pose_unique
on public.progress_photos (
    weekly_checkin_id,
    pose
)
where weekly_checkin_id is not null;

create index
    progress_photos_plan_date_lookup_idx
on public.progress_photos (
    coaching_plan_id,
    created_at
);

/******************************************************************************
    Validation Functions
******************************************************************************/

create or replace function
public.validate_progress_photo_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    parent_user_id uuid;
    parent_plan_id uuid;
    required_side_view text;
begin
    if new.photo_context = 'start' then
        select
            coaching_plans.user_id,
            start_checkins.coaching_plan_id,
            start_checkins.side_photo_view
        into
            parent_user_id,
            parent_plan_id,
            required_side_view
        from public.start_checkins
        join public.coaching_plans
          on coaching_plans.id =
             start_checkins.coaching_plan_id
        where start_checkins.id =
            new.start_checkin_id;
    else
        select
            weekly_checkins.user_id,
            weekly_checkins.coaching_plan_id,
            start_checkins.side_photo_view
        into
            parent_user_id,
            parent_plan_id,
            required_side_view
        from public.weekly_checkins
        left join public.start_checkins
          on start_checkins.coaching_plan_id =
             weekly_checkins.coaching_plan_id
         and start_checkins.status = 'completed'
        where weekly_checkins.id =
            new.weekly_checkin_id;
    end if;

    if parent_user_id is null
       or parent_plan_id is null then
        raise exception
            'The photo parent check-in does not exist.';
    end if;

    if new.user_id <> parent_user_id
       or new.coaching_plan_id <>
          parent_plan_id then
        raise exception
            'Photo ownership does not match its check-in.';
    end if;

    if new.pose = 'side'
       and required_side_view is distinct from
           new.side_view then
        raise exception
            'The side photo must use the saved side view.';
    end if;

    return new;
end;
$$;

create or replace function
public.enforce_start_checkin_photos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    photo_count integer;
begin
    if new.status = 'completed'
       and old.status is distinct from
           'completed' then

        select count(*)
        into photo_count
        from public.progress_photos
        where start_checkin_id = new.id;

        if photo_count <> 3 then
            raise exception
                'Front, side, and back photos are required.';
        end if;
    end if;

    return new;
end;
$$;

/******************************************************************************
    Triggers
******************************************************************************/

create trigger progress_photos_validate_parent
before insert or update
on public.progress_photos
for each row
execute function
    public.validate_progress_photo_parent();

create trigger progress_photos_set_updated_at
before update
on public.progress_photos
for each row
execute function public.set_updated_at();

create trigger start_checkins_require_photos
before update of status
on public.start_checkins
for each row
execute function
    public.enforce_start_checkin_photos();

/******************************************************************************
    Row Level Security
******************************************************************************/

alter table public.progress_photos
    enable row level security;

/******************************************************************************
    Progress Photo Metadata Policies
******************************************************************************/

create policy
"Users can view their own progress photos"
on public.progress_photos
for select
to authenticated
using (
    user_id = (select auth.uid())
    and exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            progress_photos.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

create policy
"Users can create their own progress photos"
on public.progress_photos
for insert
to authenticated
with check (
    user_id = (select auth.uid())
    and storage_path like
        (select auth.uid())::text || '/%'
    and exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            progress_photos.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

create policy
"Users can update their own progress photos"
on public.progress_photos
for update
to authenticated
using (
    user_id = (select auth.uid())
)
with check (
    user_id = (select auth.uid())
    and storage_path like
        (select auth.uid())::text || '/%'
    and exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            progress_photos.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

create policy
"Users can delete their own progress photos"
on public.progress_photos
for delete
to authenticated
using (
    user_id = (select auth.uid())
);

/******************************************************************************
    Private Storage Object Policies
******************************************************************************/

create policy
"Users can view their own progress photo objects"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] =
        (select auth.uid())::text
);

create policy
"Users can upload their own progress photo objects"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] =
        (select auth.uid())::text
);

create policy
"Users can update their own progress photo objects"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] =
        (select auth.uid())::text
)
with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] =
        (select auth.uid())::text
);

create policy
"Users can delete their own progress photo objects"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] =
        (select auth.uid())::text
);

/******************************************************************************
    Data API Grants
******************************************************************************/

grant select, insert, update, delete
on table public.progress_photos
to authenticated;

/******************************************************************************
    Comments
******************************************************************************/

comment on table public.progress_photos
is 'Stores metadata for private standardized progress photos.';

comment on column public.progress_photos.storage_path
is 'Object name inside the private progress-photos bucket.';

comment on column public.progress_photos.side_view
is 'Left or right side used for a standardized side photo.';
