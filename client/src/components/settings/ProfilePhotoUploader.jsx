import { useRef } from "react";
import { Camera } from "lucide-react";
import Avatar from "../ui/Avatar";
import { MAX_PHOTO_BYTES, ACCEPTED_PHOTO_TYPES } from "../../utils/photoUploadConstants";

/**
 * ProfilePhotoUploader
 * Avatar + camera button + hidden file input. Fully self-contained for
 * picking and validating a local image file. It does NOT upload anything
 * itself (Settings.jsx still does that as part of the combined
 * "save profile" submit, same as before this was split out) — it just
 * hands a validated File back to the parent via onSelect, or a message via
 * onError when the choice is invalid.
 *
 * @param {string} fullName        Used for the initials fallback + alt text.
 * @param {string} [displaySrc]    Object-URL preview or the saved profilePic.
 * @param {boolean} hasPhoto       Whether there's an existing/preview photo,
 *                                 to switch the link text between
 *                                 "Upload photo" and "Replace photo".
 * @param {File|null} pendingFile  A locally-chosen file awaiting save, to
 *                                 switch the caption between "Profile
 *                                 picture" and "New photo selected".
 * @param {(file: File) => void} onSelect  Called with a validated file.
 * @param {(message: string) => void} onError  Called with "" to clear a
 *                                 prior error, or a message to show one.
 */
function ProfilePhotoUploader({
  fullName,
  displaySrc,
  hasPhoto,
  pendingFile,
  onSelect,
  onError,
}) {
  const fileInputRef = useRef(null);

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    onError("");

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      onError("Please choose a JPG, PNG, WEBP, or GIF image.");
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      onError("Image is too large — please choose one under 5MB.");
      return;
    }

    onSelect(file);
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar
          name={fullName}
          src={displaySrc}
          size="lg"
          ring="ring-2 ring-white/10"
        />
        <button
          type="button"
          onClick={handlePickPhoto}
          title="Change profile picture"
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full aurora-bg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 border-2 border-surface-0 hover:brightness-110 transition-all focus-ring"
        >
          <Camera size={14} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_PHOTO_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div>
        <p className="text-white text-sm font-medium mb-0.5">
          {pendingFile ? "New photo selected" : "Profile picture"}
        </p>
        <p className="text-slate-500 text-xs leading-relaxed">
          JPG, PNG, WEBP or GIF. Max 5MB.
        </p>
        <button
          type="button"
          onClick={handlePickPhoto}
          className="text-indigo-400 hover:text-indigo-300 text-xs font-medium mt-1.5"
        >
          {hasPhoto ? "Replace photo" : "Upload photo"}
        </button>
      </div>
    </div>
  );
}

export default ProfilePhotoUploader;
