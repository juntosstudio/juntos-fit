/*
======================================================
001_profiles.sql

Purpose:
    Stores user profile information that belongs
    to an authenticated Supabase user.

Relationships:
    auth.users (1) ---- (1) profiles

Notes:
    Authentication data (email, password, magic links)
    remains in auth.users.

Author:
    Deborah Reyna

Created:
    2026-07-17

======================================================
*/

create table public.profiles (

    id uuid primary key
        references auth.users(id)
        on delete cascade,

    display_name text,

    date_of_birth date not null,

    --Indicates the user's biological sex. This is used to calculate BMR and other metrics.
    sex text not null check (sex in ('male', 'female')),

    --User will enter in feet and inches, but we will store in centimeters for consistency.
    height_cm numeric(5,2) not null,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()

);

/******************************************************************************
    Row Level Security
******************************************************************************/

alter table public.profiles
enable row level security;

/******************************************************************************
    Policies
******************************************************************************/

/******************************************************************************
    Triggers
******************************************************************************/

/******************************************************************************
    Indexes
******************************************************************************/