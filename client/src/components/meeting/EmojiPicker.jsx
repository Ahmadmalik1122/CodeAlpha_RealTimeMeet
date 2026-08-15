const EMOJIS = [
  "😀", "😂", "😍", "😊", "😉", "😢", "😮", "😡",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "✌️", "🤞",
  "❤️", "🔥", "🎉", "✅", "❌", "💯", "🙌", "😴",
];

/**
 * EmojiPicker
 * Lightweight popover grid — deliberately dependency-free so it doesn't
 * pull in an external emoji-picker package. Click an emoji to insert it;
 * clicking the backdrop or picking one closes the popover.
 */
function EmojiPicker({ onSelect, onClose }) {
  return (
    <>
      {/* Invisible backdrop to close on outside click */}
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 z-40 glass-panel-strong rounded-2xl p-2.5 shadow-2xl animate-scale-in w-64">
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white/10 focus-ring"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default EmojiPicker;
