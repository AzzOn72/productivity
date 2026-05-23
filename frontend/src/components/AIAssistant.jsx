import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowUp, Loader2 } from "lucide-react";
import { api, formatApiError } from "@/lib/api";

const SUGGESTIONS = [
  "Suggest a calm plan for today",
  "Help me prioritize what matters most",
  "What's a good shutdown ritual?",
  "I feel overwhelmed — what should I do first?",
];

export default function AIAssistant({ open, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "I'm here. Tell me what's on your mind, or pick one of these.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, open]);

  const send = async (text) => {
    const value = (text ?? input).trim();
    if (!value || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: value }]);
    setBusy(true);
    try {
      const { data } = await api.post("/ai/chat", { prompt: value });
      setMessages((m) => [...m, { role: "ai", text: data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", text: `(${formatApiError(e)})` }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="ai-assistant">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-velari-surface border-l border-velari-border flex flex-col fade-up">
        <div className="px-5 py-4 border-b border-velari-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-velari-brand/15 text-velari-brand flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <div>
              <div className="font-display text-[15px] tracking-tight">Velari Coach</div>
              <div className="text-[11px] text-velari-textSoft -mt-0.5">Calm, intelligent, by your side</div>
            </div>
          </div>
          <button onClick={onClose} className="text-velari-textSoft hover:text-velari-text" data-testid="ai-close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-velari-ink text-velari-cream rounded-br-md"
                    : "bg-velari-surfaceAlt text-velari-text rounded-bl-md"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-velari-textSoft text-sm">
              <Loader2 size={14} className="animate-spin" /> thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-[12.5px] px-3 py-1.5 rounded-full bg-velari-surfaceAlt hover:bg-velari-border transition-colors text-velari-text"
                data-testid="ai-suggestion"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="p-4 border-t border-velari-border"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-velari-border bg-velari-bg px-3 py-2 focus-within:ring-2 focus-within:ring-velari-brand/40">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask Velari…"
              rows={1}
              className="flex-1 bg-transparent resize-none text-[14px] outline-none placeholder:text-velari-textSoft py-1.5"
              data-testid="ai-input"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="h-9 w-9 rounded-full bg-velari-ink text-velari-cream flex items-center justify-center disabled:opacity-40"
              data-testid="ai-send"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
