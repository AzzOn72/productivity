import { useEffect, useState, useCallback } from "react";
import { Sparkles, Play, Loader2, RotateCw } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const PRESETS = [15, 30, 60, 120];

/**
 * "What now?" — the magical single-best-action card.
 * Lives on Today; also reachable from the command palette.
 */
export default function NowCard({ onAction }) {
  const [free, setFree] = useState(30);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const ask = useCallback(async (minutes = free) => {
    setBusy(true);
    try {
      const { data } = await api.post("/ai/now", { free_minutes: minutes });
      setData(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  }, [free]);

  useEffect(() => { ask(free); /* initial */ /* eslint-disable-next-line */ }, []);

  const startFocus = () => {
    if (!data) return;
    // Hand off to Focus with intent in URL (Focus is fine without — small UX cue here)
    sessionStorage.setItem("velari_focus_intent", data.action || "");
    nav("/focus");
  };

  return (
    <div className="card-soft elevated p-6 sm:p-7 relative overflow-hidden" data-testid="now-card">
      <div className="absolute -top-12 -right-10 h-44 w-44 rounded-full bg-velari-brand/12 blur-3xl pointer-events-none" />
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-brand mb-1.5 flex items-center gap-1.5">
            <Sparkles size={11} /> Right now
          </div>
          <div className="font-display text-[14px] tracking-tight text-velari-textSoft">
            What should I do this <span className="text-velari-text">moment?</span>
          </div>
        </div>
        <button
          onClick={() => ask(free)}
          disabled={busy}
          data-testid="now-refresh"
          className="text-velari-textSoft hover:text-velari-text disabled:opacity-40"
          title="Ask again"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <RotateCw size={15} />}
        </button>
      </div>

      {data ? (
        <div className="fade-up">
          <div className="font-editorial italic text-[22px] sm:text-[26px] leading-snug tracking-tight mb-2 text-velari-text">
            "{data.action}"
          </div>
          {data.rationale && (
            <div className="text-[13px] text-velari-textSoft mb-4">{data.rationale}</div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={startFocus}
              data-testid="now-start"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-velari-ink text-velari-cream text-[13px] hover:-translate-y-0.5 transition-transform ease-velari"
            >
              <Play size={12} /> Begin · {data.minutes}m
            </button>
            <div className="flex items-center gap-1 px-1 py-1 rounded-full bg-velari-surfaceAlt border border-velari-border">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => { setFree(m); ask(m); }}
                  data-testid={`now-free-${m}`}
                  className={`px-2.5 py-1 rounded-full text-[11.5px] transition-colors ${
                    free === m ? "bg-velari-ink text-velari-cream" : "text-velari-textSoft hover:text-velari-text"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[14px] text-velari-textSoft italic font-editorial">Listening to your day…</div>
      )}
    </div>
  );
}
