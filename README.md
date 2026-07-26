# Photo Camera Roll Choice

Removes `capture="environment"` from the Start Check-In and Weekly
photo inputs.

On mobile, tapping a photo card will now use the device's normal image
picker, allowing the user to either:

- take a new photo
- choose an existing photo from the camera roll / photo library

The accepted file types remain unchanged.

No database migration or Supabase push is required.
