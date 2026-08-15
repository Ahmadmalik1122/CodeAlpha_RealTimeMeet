import { useEffect, useRef, useState } from "react";
import { Copy, Check, Share2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Modal from "../ui/Modal";
import { copyToClipboard } from "../../utils/clipboard";

/**
 * InviteModal
 * "Invite by link" popup opened from the meeting room top bar. Keeps the
 * existing one-click Copy Link behaviour (MeetingRoom's own pill still
 * does that on its own), and adds:
 *   - a bigger Copy Link action inside the modal itself
 *   - the Web Share API where supported (mobile browsers mostly) — the
 *     button is simply omitted on browsers without navigator.share, which
 *     is the graceful desktop fallback the feature calls for
 *   - a QR code generated entirely client-side (no third-party image
 *     service, so the meeting link is never sent anywhere to render it)
 */
function InviteModal({ meetingId, title, onClose }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const link = `${window.location.origin}/meeting/${meetingId}`;

  // Escape/backdrop handling now lives in Modal.
  const copyTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(link);
    if (ok) {
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: title || "Join my meeting",
        text: "Join my meeting:",
        url: link,
      });
    } catch (err) {
      // AbortError just means the user closed the native share sheet.
      if (err?.name !== "AbortError") console.error("Share failed:", err);
    }
  };

  return (
    <Modal
      title="Invite people"
      icon={<QrCode size={16} className="text-indigo-300" />}
      onClose={onClose}
      maxWidth="max-w-sm"
    >
      <div>
        <div className="flex justify-center mb-5">
          <div className="bg-white p-3 rounded-xl">
            <QRCodeSVG value={link} size={168} level="M" fgColor="#0b0c10" bgColor="#ffffff" />
          </div>
        </div>

        <p className="text-slate-500 text-xs text-center mb-4">
          Scan to join, or share the link below.
        </p>

        <div className="flex items-center gap-2 glass-panel rounded-xl px-3 py-2.5 mb-3">
          <span className="flex-1 text-slate-300 text-sm truncate">{link}</span>
        </div>

        <div className={`grid gap-2 ${canShare ? "grid-cols-2" : "grid-cols-1"}`}>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/14 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors focus-ring"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy link"}
          </button>

          {canShare && (
            <button
              onClick={handleShare}
              className="btn-primary rounded-xl px-4 py-2.5 text-sm"
            >
              <Share2 size={16} />
              Share
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default InviteModal;
