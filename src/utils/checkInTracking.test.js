import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  BODY_FAT_SOURCE_VALUES,
  DEFAULT_CHECKIN_SETTINGS,
  normalizeCheckInSettings,
} from './checkInTracking'

describe('Check-In tracking constants', () => {
  test('supports the three body-fat tracking modes', () => {
    expect(BODY_FAT_SOURCE_VALUES).toEqual([
      'scale',
      'juntos_estimate',
      'none',
    ])
  })

  test('uses the current default tracking settings', () => {
    expect(DEFAULT_CHECKIN_SETTINGS).toEqual({
      track_water: true,
      track_alcohol: true,
      body_fat_source: 'none',
    })
  })
})

describe('Check-In settings normalization', () => {
  test('returns defaults when settings are missing', () => {
    expect(normalizeCheckInSettings()).toEqual({
      track_water: true,
      track_alcohol: true,
      body_fat_source: 'none',
    })
  })

  test('preserves explicit true tracking settings', () => {
    expect(
      normalizeCheckInSettings({
        track_water: true,
        track_alcohol: true,
        body_fat_source: 'scale',
      }),
    ).toEqual({
      track_water: true,
      track_alcohol: true,
      body_fat_source: 'scale',
    })
  })

  test('preserves explicit false tracking settings', () => {
    expect(
      normalizeCheckInSettings({
        track_water: false,
        track_alcohol: false,
        body_fat_source: 'none',
      }),
    ).toEqual({
      track_water: false,
      track_alcohol: false,
      body_fat_source: 'none',
    })
  })

  test('allows water and alcohol tracking to differ', () => {
    expect(
      normalizeCheckInSettings({
        track_water: false,
        track_alcohol: true,
        body_fat_source: 'juntos_estimate',
      }),
    ).toEqual({
      track_water: false,
      track_alcohol: true,
      body_fat_source: 'juntos_estimate',
    })
  })

  test.each([
    'scale',
    'juntos_estimate',
    'none',
  ])(
    'preserves valid body-fat source %s',
    (body_fat_source) => {
      expect(
        normalizeCheckInSettings({
          body_fat_source,
        }).body_fat_source,
      ).toBe(body_fat_source)
    },
  )

  test.each([
    '',
    'other',
    'rfm',
    null,
    undefined,
  ])(
    'normalizes invalid body-fat source %s to none',
    (body_fat_source) => {
      expect(
        normalizeCheckInSettings({
          body_fat_source,
        }).body_fat_source,
      ).toBe('none')
    },
  )

  test('treats omitted water setting as enabled by default', () => {
    expect(
      normalizeCheckInSettings({
        track_alcohol: false,
      }).track_water,
    ).toBe(true)
  })

  test('treats omitted alcohol setting as enabled by default', () => {
    expect(
      normalizeCheckInSettings({
        track_water: false,
      }).track_alcohol,
    ).toBe(true)
  })

  test('only explicit false disables water tracking', () => {
    for (const value of [undefined, null, '', 0, true]) {
      expect(
        normalizeCheckInSettings({
          track_water: value,
        }).track_water,
      ).toBe(true)
    }

    expect(
      normalizeCheckInSettings({
        track_water: false,
      }).track_water,
    ).toBe(false)
  })

  test('only explicit false disables alcohol tracking', () => {
    for (const value of [undefined, null, '', 0, true]) {
      expect(
        normalizeCheckInSettings({
          track_alcohol: value,
        }).track_alcohol,
      ).toBe(true)
    }

    expect(
      normalizeCheckInSettings({
        track_alcohol: false,
      }).track_alcohol,
    ).toBe(false)
  })
})
