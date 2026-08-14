import { supabase } from '../lib/supabase'

export async function loadWeeklyBodyFatProfile(
  userId,
) {
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('height_cm, sex')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
