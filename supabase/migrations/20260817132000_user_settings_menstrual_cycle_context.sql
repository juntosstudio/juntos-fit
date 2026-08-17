/*
======================================================
20260817132000_user_settings_menstrual_cycle_context.sql

Purpose:
    Adds an opt-in menstrual-cycle context preference.
    Existing users default to OFF.

Behavior:
    - Only the Settings UI for female profiles exposes
      this preference.
    - Future Weekly Check-Ins include menstrual-cycle
      context only when the preference is enabled.
    - Historical completed Weekly Check-Ins are not
      rewritten.
======================================================
*/

alter table public.user_settings
    add column if not exists
        track_menstrual_cycle_context boolean
        not null
        default false;

comment on column
    public.user_settings.track_menstrual_cycle_context
is 'Opt-in preference controlling whether future Weekly Check-Ins ask for menstrual-cycle context.';
