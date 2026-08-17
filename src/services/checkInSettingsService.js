import { supabase } from '../lib/supabase'
import {
  DEFAULT_CHECKIN_SETTINGS,
  normalizeCheckInSettings,
} from '../utils/checkInTracking'

const SETTINGS_FIELDS = `
  user_id,
  track_water,
  track_alcohol,
  track_menstrual_cycle_context,
  body_fat_source,
  created_at,
  updated_at
`

export async function loadCheckInSettings(
  userId,
) {
  if (!userId) {
    return {
      ...DEFAULT_CHECKIN_SETTINGS,
    }
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select(SETTINGS_FIELDS)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return {
    ...data,
    ...normalizeCheckInSettings(data),
  }
}

export async function saveCheckInSettings(
  userId,
  settings,
) {
  if (!userId) {
    throw new Error(
      'You must be signed in to save settings.',
    )
  }

  const normalized =
    normalizeCheckInSettings(settings)

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        ...normalized,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      },
    )
    .select(SETTINGS_FIELDS)
    .single()

  if (error) {
    throw error
  }

  return {
    ...data,
    ...normalizeCheckInSettings(data),
  }
}
