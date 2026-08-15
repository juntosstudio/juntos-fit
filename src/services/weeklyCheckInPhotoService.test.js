import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  storageFrom: vi.fn(),
  authGetUser: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.authGetUser,
    },
    from: mocks.from,
    storage: {
      from: mocks.storageFrom,
    },
  },
}))

import {
  loadWeeklyCheckInPhotos,
  uploadWeeklyCheckInPhoto,
} from './weeklyCheckInPhotoService'

function makeDbQuery({
  data = null,
  error = null,
} = {}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  }

  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.order.mockResolvedValue({
    data,
    error,
  })
  query.maybeSingle.mockResolvedValue({
    data,
    error,
  })
  query.single.mockResolvedValue({
    data,
    error,
  })

  return query
}

function makeStorage({
  signedUrl = 'https://signed.example/photo',
  signedUrlError = null,
  uploadError = null,
  removeError = null,
} = {}) {
  return {
    createSignedUrl: vi.fn().mockResolvedValue({
      data: signedUrlError
        ? null
        : { signedUrl },
      error: signedUrlError,
    }),
    upload: vi.fn().mockResolvedValue({
      error: uploadError,
    }),
    remove: vi.fn().mockResolvedValue({
      error: removeError,
    }),
  }
}

describe('weeklyCheckInPhotoService loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns an empty array when Weekly Check-In id is missing', async () => {
    await expect(
      loadWeeklyCheckInPhotos(null),
    ).resolves.toEqual([])

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('loads Weekly photo metadata and signed URLs', async () => {
    const db = makeDbQuery({
      data: [
        {
          id: 'front-1',
          pose: 'front',
          storage_path: 'weekly/front.jpg',
        },
      ],
    })
    mocks.from.mockReturnValue(db)

    const storage = makeStorage({
      signedUrl: 'https://signed/front',
    })
    mocks.storageFrom.mockReturnValue(
      storage,
    )

    const result =
      await loadWeeklyCheckInPhotos(
        'weekly-1',
      )

    expect(db.eq).toHaveBeenCalledWith(
      'weekly_checkin_id',
      'weekly-1',
    )
    expect(result).toEqual([
      expect.objectContaining({
        id: 'front-1',
        signed_url:
          'https://signed/front',
      }),
    ])
  })

  test('handles null photo rows as an empty list', async () => {
    mocks.from.mockReturnValue(
      makeDbQuery({
        data: null,
      }),
    )
    mocks.storageFrom.mockReturnValue(
      makeStorage(),
    )

    await expect(
      loadWeeklyCheckInPhotos(
        'weekly-1',
      ),
    ).resolves.toEqual([])
  })
})

describe('weeklyCheckInPhotoService upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
      error: null,
    })
  })

  test('requires plan, Weekly Check-In, and file', async () => {
    await expect(
      uploadWeeklyCheckInPhoto({
        coachingPlanId: 'plan-1',
        weeklyCheckInId: null,
        pose: 'front',
        file: null,
      }),
    ).rejects.toThrow(
      'A plan, Weekly Check-In, and photo are required.',
    )
  })

  test('rejects invalid pose', async () => {
    await expect(
      uploadWeeklyCheckInPhoto({
        coachingPlanId: 'plan-1',
        weeklyCheckInId: 'weekly-1',
        pose: 'profile',
        file: {
          name: 'x.jpg',
          type: 'image/jpeg',
          size: 10,
        },
      }),
    ).rejects.toThrow(
      'The photo pose is invalid.',
    )
  })

  test('requires saved left or right side for side pose', async () => {
    await expect(
      uploadWeeklyCheckInPhoto({
        coachingPlanId: 'plan-1',
        weeklyCheckInId: 'weekly-1',
        pose: 'side',
        sideView: 'center',
        file: {
          name: 'x.jpg',
          type: 'image/jpeg',
          size: 10,
        },
      }),
    ).rejects.toThrow(
      'Use the saved left or right side photo.',
    )
  })

  test('inserts Weekly metadata and returns signed URL plus original file name', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      444,
    )

    const existingQuery = makeDbQuery({
      data: null,
    })
    const insertQuery = makeDbQuery({
      data: {
        id: 'photo-1',
        storage_path:
          'user-1/plan-1/weekly/weekly-1/front-444.jpg',
      },
    })

    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(insertQuery)

    const storage = makeStorage({
      signedUrl:
        'https://signed/weekly-front',
    })
    mocks.storageFrom.mockReturnValue(
      storage,
    )

    const file = {
      name: 'my-front.jpg',
      type: 'image/jpeg',
      size: 321,
    }

    const result =
      await uploadWeeklyCheckInPhoto({
        coachingPlanId: 'plan-1',
        weeklyCheckInId: 'weekly-1',
        pose: 'front',
        file,
      })

    expect(
      insertQuery.insert,
    ).toHaveBeenCalledWith({
      user_id: 'user-1',
      coaching_plan_id: 'plan-1',
      start_checkin_id: null,
      weekly_checkin_id: 'weekly-1',
      photo_context: 'weekly',
      pose: 'front',
      side_view: null,
      storage_path:
        'user-1/plan-1/weekly/weekly-1/front-444.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 321,
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: 'photo-1',
        signed_url:
          'https://signed/weekly-front',
        name: 'my-front.jpg',
      }),
    )

    vi.restoreAllMocks()
  })

  test('uses the saved side in Weekly photo metadata', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      555,
    )

    const existingQuery = makeDbQuery({
      data: null,
    })
    const insertQuery = makeDbQuery({
      data: {
        id: 'photo-1',
        storage_path:
          'user-1/plan-1/weekly/weekly-1/side-555.png',
      },
    })
    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(insertQuery)

    mocks.storageFrom.mockReturnValue(
      makeStorage(),
    )

    await uploadWeeklyCheckInPhoto({
      coachingPlanId: 'plan-1',
      weeklyCheckInId: 'weekly-1',
      pose: 'side',
      sideView: 'right',
      file: {
        name: 'side.png',
        type: 'image/png',
        size: 20,
      },
    })

    expect(
      insertQuery.insert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        pose: 'side',
        side_view: 'right',
      }),
    )

    vi.restoreAllMocks()
  })

  test('replaces existing Weekly pose and removes old storage object', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      666,
    )

    const existingQuery = makeDbQuery({
      data: {
        id: 'old-photo',
        storage_path: 'old/side.jpg',
      },
    })
    const updateQuery = makeDbQuery({
      data: {
        id: 'old-photo',
        storage_path:
          'user-1/plan-1/weekly/weekly-1/side-666.jpg',
      },
    })
    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(updateQuery)

    const storage = makeStorage()
    mocks.storageFrom.mockReturnValue(
      storage,
    )

    await uploadWeeklyCheckInPhoto({
      coachingPlanId: 'plan-1',
      weeklyCheckInId: 'weekly-1',
      pose: 'side',
      sideView: 'right',
      file: {
        name: 'side.jpg',
        type: 'image/jpeg',
        size: 20,
      },
    })

    expect(
      updateQuery.update,
    ).toHaveBeenCalled()
    expect(storage.remove).toHaveBeenCalledWith(
      ['old/side.jpg'],
    )

    vi.restoreAllMocks()
  })

  test('cleans up new Weekly object when metadata save fails', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      777,
    )

    const existingQuery = makeDbQuery({
      data: null,
    })
    const metadataError =
      new Error('Metadata failed')
    const insertQuery = makeDbQuery({
      error: metadataError,
    })
    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(insertQuery)

    const storage = makeStorage()
    mocks.storageFrom.mockReturnValue(
      storage,
    )

    await expect(
      uploadWeeklyCheckInPhoto({
        coachingPlanId: 'plan-1',
        weeklyCheckInId: 'weekly-1',
        pose: 'front',
        file: {
          name: 'front.jpg',
          type: 'image/jpeg',
          size: 10,
        },
      }),
    ).rejects.toBe(metadataError)

    expect(storage.remove).toHaveBeenCalledWith(
      [
        'user-1/plan-1/weekly/weekly-1/front-777.jpg',
      ],
    )

    vi.restoreAllMocks()
  })

  test('does not fail replacement when deleting old Weekly storage object fails', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      888,
    )

    const existingQuery = makeDbQuery({
      data: {
        id: 'old-photo',
        storage_path: 'old/front.jpg',
      },
    })
    const updateQuery = makeDbQuery({
      data: {
        id: 'old-photo',
        storage_path:
          'user-1/plan-1/weekly/weekly-1/front-888.jpg',
      },
    })
    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(updateQuery)

    const storage = makeStorage({
      removeError: new Error(
        'Old cleanup failed',
      ),
    })
    mocks.storageFrom.mockReturnValue(
      storage,
    )

    await expect(
      uploadWeeklyCheckInPhoto({
        coachingPlanId: 'plan-1',
        weeklyCheckInId: 'weekly-1',
        pose: 'front',
        file: {
          name: 'front.jpg',
          type: 'image/jpeg',
          size: 10,
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'old-photo',
      }),
    )

    vi.restoreAllMocks()
  })
})
