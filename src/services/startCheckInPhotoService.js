import { supabase } from '../lib/supabase'

const PHOTO_FIELDS = `
  id,
  user_id,
  coaching_plan_id,
  start_checkin_id,
  photo_context,
  pose,
  side_view,
  storage_path,
  mime_type,
  size_bytes,
  created_at,
  updated_at
`

const MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

const ALLOWED_POSES = [
  'front',
  'side',
  'back',
]

function getPhotoExtension(file) {
  const mimeExtension =
    MIME_EXTENSION_MAP[file?.type]

  if (mimeExtension) {
    return mimeExtension
  }

  const extension = String(
    file?.name ?? '',
  )
    .split('.')
    .pop()
    .toLowerCase()

  if (
    Object.values(MIME_EXTENSION_MAP).includes(
      extension,
    )
  ) {
    return extension
  }

  throw new Error(
    'Use a JPEG, PNG, WebP, HEIC, or HEIF image.',
  )
}

async function getSignedInUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'You must be signed in to upload photos.',
    )
  }

  return user.id
}

// Loads private photo metadata and temporary preview URLs.
export async function loadStartCheckInPhotos(
  startCheckInId,
) {
  if (!startCheckInId) {
    return []
  }

  const { data: photos, error } =
    await supabase
      .from('progress_photos')
      .select(PHOTO_FIELDS)
      .eq(
        'start_checkin_id',
        startCheckInId,
      )
      .order('created_at')

  if (error) {
    throw error
  }

  return Promise.all(
    photos.map(async (photo) => {
      const {
        data,
        error: signedUrlError,
      } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(
          photo.storage_path,
          60 * 60,
        )

      if (signedUrlError) {
        throw signedUrlError
      }

      return {
        ...photo,
        signed_url: data.signedUrl,
      }
    }),
  )
}

// Uploads or replaces one standardized Start Check-In photo.
export async function uploadStartCheckInPhoto({
  coachingPlanId,
  startCheckInId,
  pose,
  sideView = null,
  file,
}) {
  if (
    !coachingPlanId ||
    !startCheckInId ||
    !file
  ) {
    throw new Error(
      'A plan, Start Check-In, and photo are required.',
    )
  }

  if (!ALLOWED_POSES.includes(pose)) {
    throw new Error('The photo pose is invalid.')
  }

  if (
    pose === 'side' &&
    !['left', 'right'].includes(sideView)
  ) {
    throw new Error(
      'Choose the left or right side photo.',
    )
  }

  const userId = await getSignedInUserId()
  const extension = getPhotoExtension(file)
  const storagePath = [
    userId,
    coachingPlanId,
    'start',
    startCheckInId,
    `${pose}-${Date.now()}.${extension}`,
  ].join('/')

  const { data: existing, error: loadError } =
    await supabase
      .from('progress_photos')
      .select(PHOTO_FIELDS)
      .eq(
        'start_checkin_id',
        startCheckInId,
      )
      .eq('pose', pose)
      .maybeSingle()

  if (loadError) {
    throw loadError
  }

  const { error: uploadError } =
    await supabase.storage
      .from('progress-photos')
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType:
          file.type || undefined,
        upsert: false,
      })

  if (uploadError) {
    throw uploadError
  }

  const values = {
    user_id: userId,
    coaching_plan_id: coachingPlanId,
    start_checkin_id: startCheckInId,
    weekly_checkin_id: null,
    photo_context: 'start',
    pose,
    side_view:
      pose === 'side' ? sideView : null,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size || null,
  }

  const query = existing
    ? supabase
        .from('progress_photos')
        .update(values)
        .eq('id', existing.id)
    : supabase
        .from('progress_photos')
        .insert(values)

  const { data: photo, error } =
    await query
      .select(PHOTO_FIELDS)
      .single()

  if (error) {
    await supabase.storage
      .from('progress-photos')
      .remove([storagePath])

    throw error
  }

  if (
    existing?.storage_path &&
    existing.storage_path !== storagePath
  ) {
    await supabase.storage
      .from('progress-photos')
      .remove([existing.storage_path])
  }

  return photo
}
