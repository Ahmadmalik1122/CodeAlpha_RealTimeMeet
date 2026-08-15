import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Send, Paperclip, FileText, Download, Smile, Check, CheckCheck, MessageSquare } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import PanelShell from "../ui/PanelShell";
import EmptyState from "../ui/EmptyState";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileMessage({ msg, own }) {
  const isImage = msg.fileType?.startsWith("image/");

  return (
    <div
      className={`rounded-xl p-2.5 max-w-full ${
        own ? "bg-indigo-600/25 border border-indigo-500/20" : "bg-white/[0.05] border border-white/8"
      }`}
    >
      {isImage ? (
        <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noreferrer">
          <img
            src={msg.fileUrl}
            alt={msg.fileName}
            className="max-h-40 rounded-lg mb-2 object-contain"
          />
        </a>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
          <FileText size={16} className="text-indigo-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm truncate">{msg.fileName}</p>
          <p className="text-slate-400 text-xs">{formatFileSize(msg.fileSize)}</p>
        </div>
        <a
          href={msg.fileUrl}
          download={msg.fileName}
          target="_blank"
          rel="noreferrer"
          className="text-slate-300 hover:text-white p-1.5 rounded shrink-0 focus-ring"
          title={`Download ${msg.fileName}`}
        >
          <Download size={16} />
        </a>
      </div>
    </div>
  );
}

// Three-dot "someone is typing" bubble, matched to the incoming-message
// style so it reads as part of the conversation rather than a toast.
function TypingIndicator({ names }) {
  if (!names || names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names.length} people are typing`;

  return (
    <div className="flex items-center gap-2 px-0.5 animate-fade-in">
      <div className="bg-white/[0.06] rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
      </div>
      <span className="text-slate-500 text-xs truncate">{label}</span>
    </div>
  );
}

function ChatPanel({
  messages,
  onSend,
  onSendFile,
  fileError,
  onClose,
  currentUser,
  typingUsers = [],
  onTyping,
  readReceipts = {},
  chatDisabled = false,
  isHost = false,
}) {
  // The host can always send messages, even while chat is disabled for
  // everyone else (mirrors the server-side check in socket.js).
  const composerLocked = chatDisabled && !isHost;
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll: jump to the newest message whenever the list changes, or
  // when someone starts/stops typing (so the typing bubble stays visible).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers.length]);

  // Latest moment (ms) at which any other participant reported having read
  // the chat. Any of our own messages sent before that point count as seen.
  const latestPeerReadAt = useMemo(
    () =>
      Object.values(readReceipts).reduce((max, r) => Math.max(max, r.at || 0), 0),
    [readReceipts]
  );

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
    setEmojiOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    onTyping?.(e.target.value.length > 0);
  };

  const handleEmojiSelect = (emoji) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (file) onSendFile(file);
    e.target.value = ""; // allow picking the same file again later
  };

  return (
    <PanelShell title="In-call messages" onClose={onClose} closeLabel="Close chat">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3.5">
        {messages.length === 0 && (
          <EmptyState
            icon={<MessageSquare size={22} className="text-slate-500" />}
            title="No messages yet"
            description="Messages and files here are only visible to people in this call."
          />
        )}

        {messages.map((msg, index) => {
          const own = currentUser && msg.sender === currentUser;
          const seen = own && msg.timestamp && latestPeerReadAt >= msg.timestamp;

          return (
            <div key={index} className={`flex flex-col ${own ? "items-end" : "items-start"}`}>
              <div className="flex items-baseline gap-2 mb-0.5 px-0.5">
                <span className={`text-xs font-medium ${own ? "text-indigo-300" : "text-cyan-300"}`}>
                  {own ? "You" : msg.sender}
                </span>
                <span className="text-slate-500 text-[11px]">{msg.time}</span>
              </div>

              {msg.type === "file" ? (
                <FileMessage msg={msg} own={own} />
              ) : (
                <p
                  className={`text-sm break-words max-w-[85%] px-3 py-2 rounded-2xl ${
                    own
                      ? "bg-indigo-600/90 text-white rounded-tr-sm"
                      : "bg-white/[0.06] text-slate-100 rounded-tl-sm"
                  }`}
                >
                  {msg.message}
                </p>
              )}

              {/* Read receipt — only meaningful on our own messages. */}
              {own && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 px-0.5">
                  {seen ? (
                    <>
                      <CheckCheck size={13} className="text-indigo-300" />
                      Seen
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      Sent
                    </>
                  )}
                </span>
              )}
            </div>
          );
        })}

        <TypingIndicator names={typingUsers} />
        <div ref={endRef} />
      </div>

      {fileError && (
        <p className="text-red-400 text-xs px-4 pb-1">{fileError}</p>
      )}

      {composerLocked ? (
        <div className="p-4 border-t border-white/8 text-center">
          <p className="text-slate-500 text-xs">
            Chat has been disabled by the host.
          </p>
        </div>
      ) : (
        <div className="relative p-3 border-t border-white/8 flex gap-2">
          {emojiOpen && (
            <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setEmojiOpen(false)} />
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFilePick}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/14 flex items-center justify-center shrink-0 transition-colors focus-ring"
            title="Attach a file"
          >
            <Paperclip size={16} className="text-white" />
          </button>

          <button
            onClick={() => setEmojiOpen((open) => !open)}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors focus-ring ${
              emojiOpen ? "bg-white/20" : "bg-white/8 hover:bg-white/14"
            }`}
            title="Emoji"
          >
            <Smile size={16} className="text-white" />
          </button>

          <input
            ref={inputRef}
            className="input-field flex-1 rounded-full px-4 py-2 text-sm"
            placeholder="Send a message"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={() => onTyping?.(false)}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 focus-ring ${
              text.trim() ? "aurora-bg" : "bg-white/8 cursor-not-allowed"
            }`}
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      )}
    </PanelShell>
  );
}

export default memo(ChatPanel);
