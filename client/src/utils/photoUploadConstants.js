// Shared constants for validating a locally-chosen profile photo file.
// Extracted out of ProfilePhotoUploader.jsx (which now exports only the
// component, as required by react-refresh/only-export-components) so both
// the uploader and anything else that needs the same limits can import
// from one place.
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB — plenty for a profile
// photo, well under the server's generic 20MB upload cap.
export const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
