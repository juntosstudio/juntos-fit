export const BODY_FAT_SOURCE_VALUES = [
  'scale',
  'juntos_estimate',
  'none',
]

export const DEFAULT_CHECKIN_SETTINGS = {
  track_water: true,
  track_alcohol: true,
  body_fat_source: 'none',
}

export function normalizeCheckInSettings(
  settings,
) {
  const bodyFatSource =
    BODY_FAT_SOURCE_VALUES.includes(
      settings?.body_fat_source,
    )
      ? settings.body_fat_source
      : DEFAULT_CHECKIN_SETTINGS.body_fat_source

  return {
    track_water:
      settings?.track_water !== false,
    track_alcohol:
      settings?.track_alcohol !== false,
    body_fat_source: bodyFatSource,
  }
}
