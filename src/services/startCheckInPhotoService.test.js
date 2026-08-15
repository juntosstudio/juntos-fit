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
  loadStartCheckInPhotos,
  uploadStartCheckInPhoto,
} from './startCheckInPhotoService'

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

describe('startCheckInPhotoService loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns an empty array when Start Check-In id is missing', async () => {
    await expect(
      loadStartCheckInPhotos(null),
    ).resolves.toEqual([])

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('loads photo metadata and adds signed URLs', async () => {
    const db = makeDbQuery({
      data: [
        {
          id: 'front-1',
          pose: 'front',
          storage_path: 'a/front.jpg',
        },
        {
          id: 'back-1',
          pose: 'back',
          storage_path: 'a/back.jpg',
        },
      ],
    })
    mocks.from.mockReturnValue(db)

    const storage = makeStorage()
    mocks.storageFrom.mockReturnValue(
      storage,
    )

    const result =
      await loadStartCheckInPhotos(
        'start-1',
      )

    expect(mocks.from).toHaveBeenCalledWith(
      'progress_photos',
    )
    expect(db.eq).toHaveBeenCalledWith(
      'start_checkin_id',
      'start-1',
    )
    expect(db.order).toHaveBeenCalledWith(
      'created_at',
    )
    expect(
      storage.createSignedUrl,
    ).toHaveBeenNthCalledWith(
      1,
      'a/front.jpg',
      3600,
    )
    expect(
      storage.createSignedUrl,
    ).toHaveBeenNthCalledWith(
      2,
      'a/back.jpg',
      3600,
    )
    expect(result).toEqual([
      expect.objectContaining({
        id: 'front-1',
        signed_url:
          'https://signed.example/photo',
      }),
      expect.objectContaining({
        id: 'back-1',
        signed_url:
          'https://signed.example/photo',
      }),
    ])
  })

  test('propagates metadata load errors', async () => {
    const error = new Error('Photo load failed')
    mocks.from.mockReturnValue(
      makeDbQuery({ error }),
    )

    await expect(
      loadStartCheckInPhotos(
        'start-1',
      ),
    ).rejects.toBe(error)
  })

  test('propagates signed URL errors', async () => {
    mocks.from.mockReturnValue(
      makeDbQuery({
        data: [
          {
            id: 'front-1',
            storage_path: 'front.jpg',
          },
        ],
      }),
    )
    const error = new Error('URL failed')
    mocks.storageFrom.mockReturnValue(
      makeStorage({
        signedUrlError: error,
      }),
    )

    await expect(
      loadStartCheckInPhotos(
        'start-1',
      ),
    ).rejects.toBe(error)
  })
})

describe('startCheckInPhotoService upload', () => {
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

  test('requires plan, Start Check-In, and file', async () => {
    await expect(
      uploadStartCheckInPhoto({
        coachingPlanId: 'plan-1',
        startCheckInId: null,
        pose: 'front',
        file: null,
      }),
    ).rejects.toThrow(
      'A plan, Start Check-In, and photo are required.',
    )
  })

  test('rejects an invalid pose', async () => {
    await expect(
      uploadStartCheckInPhoto({
        coachingPlanId: 'plan-1',
        startCheckInId: 'start-1',
        pose: 'three-quarter',
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

  test('requires left or right for a side photo', async () => {
    await expect(
      uploadStartCheckInPhoto({
        coachingPlanId: 'plan-1',
        startCheckInId: 'start-1',
        pose: 'side',
        sideView: null,
        file: {
          name: 'x.jpg',
          type: 'image/jpeg',
          size: 10,
        },
      }),
    ).rejects.toThrow(
      'Choose the left or right side photo.',
    )
  })

  test('requires a signed-in user', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    })

    await expect(
      uploadStartCheckInPhoto({
        coachingPlanId: 'plan-1',
        startCheckInId: 'start-1',
        pose: 'front',
        file: {
          name: 'x.jpg',
          type: 'image/jpeg',
          size: 10,
        },
      }),
    ).rejects.toThrow(
      'You must be signed in to upload photos.',
    )
  })

  test('accepts supported MIME types and builds expected storage path', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      123456789,
    )

    const existingQuery = makeDbQuery({
      data: null,
    })
    const insertQuery = makeDbQuery({
      data: {
        id: 'photo-1',
      },
    })

    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(insertQuery)

    const storage = makeStorage()
    mocks.storageFrom.mockReturnValue(
      storage,
    )

    const file = {
      name: 'front.jpeg',
      type: 'image/jpeg',
      size: 1234,
    }

    await uploadStartCheckInPhoto({
      coachingPlanId: 'plan-1',
      startCheckInId: 'start-1',
      pose: 'front',
      file,
    })

    expect(storage.upload).toHaveBeenCalledWith(
      'user-1/plan-1/start/start-1/front-123456789.jpg',
      file,
      {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: false,
      },
    )

    vi.restoreAllMocks()
  })

  test('falls back to a supported filename extension when MIME type is missing', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      999,
    )

    const existingQuery = makeDbQuery({
      data: null,
    })
    const insertQuery = makeDbQuery({
      data: {
        id: 'photo-1',
      },
    })
    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(insertQuery)

    const storage = makeStorage()
    mocks.storageFrom.mockReturnValue(
      storage,
    )

    const file = {
      name: 'photo.webp',
      type: '',
      size: 55,
    }

    await uploadStartCheckInPhoto({
      coachingPlanId: 'plan-1',
      startCheckInId: 'start-1',
      pose: 'back',
      file,
    })

    expect(storage.upload).toHaveBeenCalledWith(
      'user-1/plan-1/start/start-1/back-999.webp',
      file,
      expect.any(Object),
    )

    vi.restoreAllMocks()
  })

  test('rejects unsupported image extensions', async () => {
    await expect(
      uploadStartCheckInPhoto({
        coachingPlanId: 'plan-1',
        startCheckInId: 'start-1',
        pose: 'front',
        file: {
          name: 'photo.gif',
          type: 'image/gif',
          size: 10,
        },
      }),
    ).rejects.toThrow(
      'Use a JPEG, PNG, WebP, HEIC, or HEIF image.',
    )
  })

  test('inserts metadata for a new pose', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      111,
    )

    const existingQuery = makeDbQuery({
      data: null,
    })
    const insertQuery = makeDbQuery({
      data: {
        id: 'photo-1',
      },
    })
    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(insertQuery)

    const storage = makeStorage()
    mocks.storageFrom.mockReturnValue(
      storage,
    )

    const file = {
      name: 'side.png',
      type: 'image/png',
      size: 222,
    }

    await uploadStartCheckInPhoto({
      coachingPlanId: 'plan-1',
      startCheckInId: 'start-1',
      pose: 'side',
      sideView: 'left',
      file,
    })

    expect(
      insertQuery.insert,
    ).toHaveBeenCalledWith({
      user_id: 'user-1',
      coaching_plan_id: 'plan-1',
      start_checkin_id: 'start-1',
      weekly_checkin_id: null,
      photo_context: 'start',
      pose: 'side',
      side_view: 'left',
      storage_path:
        'user-1/plan-1/start/start-1/side-111.png',
      mime_type: 'image/png',
      size_bytes: 222,
    })

    vi.restoreAllMocks()
  })

  test('updates metadata and removes the old object when replacing a pose', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      222,
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
      },
    })

    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(updateQuery)

    const storage = makeStorage()
    mocks.storageFrom.mockReturnValue(
      storage,
    )

    const file = {
      name: 'front.jpg',
      type: 'image/jpeg',
      size: 10,
    }

    await uploadStartCheckInPhoto({
      coachingPlanId: 'plan-1',
      startCheckInId: 'start-1',
      pose: 'front',
      file,
    })

    expect(
      updateQuery.update,
    ).toHaveBeenCalled()
    expect(
      updateQuery.eq,
    ).toHaveBeenCalledWith(
      'id',
      'old-photo',
    )
    expect(storage.remove).toHaveBeenCalledWith(
      ['old/front.jpg'],
    )

    vi.restoreAllMocks()
  })

  test('cleans up the new storage object when metadata save fails', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      333,
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

    const file = {
      name: 'front.jpg',
      type: 'image/jpeg',
      size: 10,
    }

    await expect(
      uploadStartCheckInPhoto({
        coachingPlanId: 'plan-1',
        startCheckInId: 'start-1',
        pose: 'front',
        file,
      }),
    ).rejects.toBe(metadataError)

    expect(storage.remove).toHaveBeenCalledWith(
      [
        'user-1/plan-1/start/start-1/front-333.jpg',
      ],
    )

    vi.restoreAllMocks()
  })
})
