export const DEFAULT_CHECKIN_SETTINGS = {
  track_water: true,
  track_alcohol: true,
}

export function normalizeCheckInSettings(
  settings,
) {
  return {
    track_water:
      settings?.track_water !== false,
    track_alcohol:
      settings?.track_alcohol !== false,
  }
}
