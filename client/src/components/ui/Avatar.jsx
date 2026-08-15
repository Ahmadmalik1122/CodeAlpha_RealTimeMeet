import { useState } from "react";
import { getInitials, getAvatarColor } from "../../utils/initials";

const SIZES = {
  xs: "w-7 h-7 text-[11px]",
  sm: "w-9 h-9 text-sm",
  // Thumbnail tiles: same box as `sm` but a smaller glyph, so initials still
  // fit inside a PiP/filmstrip tile.
  tile: "w-9 h-9 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 sm:w-20 sm:h-20 text-xl sm:text-2xl",
};

/**
 * Avatar
 * Initials-on-a-deterministic-color circle. Every place that used to
 * hand-roll this (participant tiles, the people list, the waiting room,
 * the dashboard header) now shares one implementation, so the sizing and
 * ring treatment can never drift apart between them.
 *
 * @param {"xs"|"sm"|"md"|"lg"} size
 * @param {string} ring  Tailwind ring classes, e.g. an emerald speaking ring
 * @param {string} [src] Optional profile picture URL. Falls back to the
 *   initials-on-color circle when omitted or if the image fails to load
 *   (e.g. a stale/broken uploaded-file URL).
 */
function Avatar({ name, size = "md", ring = "ring-1 ring-white/10", className = "", src, ...rest }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = src && !imgFailed;

  return (
    <div
      {...rest}
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden ${
        SIZES[size] || SIZES.md
      } ${ring} ${className}`}
      style={showImage ? undefined : { backgroundColor: getAvatarColor(name) }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name || "Profile"}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

export default Avatar;
