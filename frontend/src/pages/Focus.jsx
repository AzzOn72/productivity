import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { X, Play, Pause, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

const PRESETS = [
  { id: "25", label: "Pomodoro", minutes: 25 },
  { id: "50", label: "Deep work", minutes: 50 },
  { id: "90", label: "Flow", minutes: 90 },
];

const FOCUS_BG = "https://static.prod-images.emergentagent.com/jobs/4fd5d062-09fa-42b2-abd4-e7e2bb7da3f2/images/ca79768da3bd447b2e838c9292c4444638042c53d8ef34ee9d375d2df15ccf74.png";

export default function Focus() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [intent, setIntent] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [started, setStarted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(timerRef.current);
            handleComplete(duration * 60);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else if (timerRef.current) clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [running, duration]);

  useEffect(() => {
    // Prevent scroll while in focus
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const begin = async () => {
    setStarted(true);
    setRemaining(duration * 60);
    setRunning(true);
    try {
      const { data } = await api.post("/focus/start", {
        intent,
        duration_minutes: duration,
        mode: duration >= 90 ? "flow" : duration >= 50 ? "deep" : "pomodoro",
      });
      setSessionId(data.focus_id);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const handleComplete = async (completedSec) => {
    setRunning(false);
    if (sessionId) {
      try {
        await api.post(`/focus/${sessionId}/complete`, {
          completed_minutes: Math.round(completedSec / 60),
          interrupted: completedSec < duration * 60,
        });
      } catch (e) {}
    }
    toast.success("Quiet ring. Well done.");
  };

  const exit = async () => {
    if (running && sessionId) {
      const completed = (duration * 60 - remaining);
      try {
        await api.post(`/focus/${sessionId}/complete`, {
          completed_minutes: Math.round(completed / 60),
          interrupted: true,
        });
      } catch (e) {}
    }
    nav("/today");
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const pct = ((duration * 60 - remaining) / (duration * 60)) * 100;

  return (
    <div className="min-h-screen focus-bg relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <img src={FOCUS_BG} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/30" />
      <div className="relative min-h-screen flex flex-col">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="text-[11px] tracking-[0.2em] uppercase text-velari-textSoft">Focus Mode</div>
          <button
            onClick={exit}
            data-testid="focus-exit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[12px] hover:bg-velari-surfaceAlt transition-colors"
          >
            <X size={13} /> Exit
          </button>
        </div>

        {!started ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="w-full max-w-xl text-center fade-up">
              <div className="text-[11px] tracking-[0.22em] uppercase text-velari-brand mb-5">A breath before you begin</div>
              <h1 className="font-display text-4xl sm:text-5xl tracking-tight mb-10 leading-[1.05]">
                What is the single thing that matters now?
              </h1>
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="Type one intention…"
                data-testid="focus-intent"
                rows={2}
                className="w-full bg-transparent border-b border-velari-border focus:border-velari-brand text-center font-editorial italic text-2xl outline-none pb-3 transition-colors resize-none"
              />
              <div className="mt-10 flex items-center justify-center gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setDuration(p.minutes); setRemaining(p.minutes * 60); }}
                    data-testid={`focus-preset-${p.id}`}
                    className={`px-4 py-2 rounded-full text-[13px] border transition-colors ${
                      duration === p.minutes ? "bg-velari-ink text-velari-cream border-velari-ink" : "bg-velari-surface border-velari-border hover:bg-velari-surfaceAlt"
                    }`}
                  >
                    {p.label} · {p.minutes}m
                  </button>
                ))}
              </div>
              <button
                onClick={begin}
                disabled={!intent.trim()}
                data-testid="focus-begin"
                className="mt-10 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-velari-brand text-white text-[15px] font-medium hover:-translate-y-0.5 transition-transform ease-velari disabled:opacity-40 disabled:translate-y-0 shadow-[0_18px_40px_-15px_rgba(200,107,82,0.55)]"
              >
                <Play size={15} /> Enter focus
              </button>
              <div className="mt-6 text-[12px] text-velari-textSoft">Velari will hold the door. Nothing will reach you.</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center w-full max-w-2xl fade-up">
              <div className="text-[11px] tracking-[0.22em] uppercase text-velari-brand mb-3">Now focusing on</div>
              <div className="font-editorial italic text-2xl sm:text-3xl mb-10 max-w-xl mx-auto leading-snug">{intent}</div>

              <div className="relative mx-auto h-72 w-72">
                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                  <circle cx="50" cy="50" r="46" stroke="hsl(var(--velari-border))" strokeWidth="1.5" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    stroke="hsl(var(--velari-brand))"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray={Math.PI * 92}
                    strokeDashoffset={Math.PI * 92 * (1 - pct / 100)}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className={`absolute inset-6 rounded-full bg-velari-brand/8 ${running ? "breathe" : ""}`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-6xl tracking-tight" data-testid="focus-timer">{fmt(remaining)}</div>
                  <div className="text-[12px] text-velari-textSoft mt-2 uppercase tracking-[0.18em]">{running ? "in focus" : "paused"}</div>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  onClick={() => setRunning((r) => !r)}
                  data-testid="focus-toggle"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-velari-ink text-velari-cream hover:-translate-y-0.5 transition-transform ease-velari"
                >
                  {running ? <Pause size={15} /> : <Play size={15} />}
                  {running ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => { setRemaining(duration * 60); setRunning(false); }}
                  data-testid="focus-reset"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-velari-border hover:bg-velari-surfaceAlt"
                >
                  <RotateCcw size={15} /> Reset
                </button>
              </div>

              <div className="mt-10 text-[12px] text-velari-textSoft flex items-center justify-center gap-2">
                <Sparkles size={12} className="text-velari-brand" />
                Breathe. The rest of the world is waiting patiently.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
