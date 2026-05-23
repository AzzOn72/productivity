import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { X, Play, Pause, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

const PRESETS = [
  { id: "25", label: "Spark", minutes: 25, mode: "pomodoro", intensity: 1 },
  { id: "50", label: "Deep", minutes: 50, mode: "deep", intensity: 2 },
  { id: "90", label: "Flow", minutes: 90, mode: "flow", intensity: 3 },
];

const INTENSITY = {
  1: { label: "Spark", glow: "0.45", grain: false },
  2: { label: "Deep", glow: "0.65", grain: true },
  3: { label: "Flow", glow: "0.85", grain: true },
};

export default function Focus() {
  const nav = useNavigate();
  const [duration, setDuration] = useState(25);
  const [intensity, setIntensity] = useState(1);
  const [mode, setMode] = useState("pomodoro");
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [intent, setIntent] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const timerRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  const interruptsRef = useRef(0);

  useEffect(() => {
    if (running) {
      lastTickRef.current = Date.now();
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
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Visibility loss is treated as a soft interruption (counts toward flow score)
  useEffect(() => {
    if (!started || !running) return;
    const handleHidden = () => {
      if (document.hidden) interruptsRef.current += 1;
    };
    document.addEventListener("visibilitychange", handleHidden);
    return () => document.removeEventListener("visibilitychange", handleHidden);
  }, [started, running]);

  const begin = async () => {
    setStarted(true);
    setRemaining(duration * 60);
    setRunning(true);
    interruptsRef.current = 0;
    try {
      const { data } = await api.post("/focus/start", {
        intent,
        duration_minutes: duration,
        mode,
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
          interrupted: interruptsRef.current > 0 || completedSec < duration * 60,
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

  // Flow score: 100 minus penalties for interruptions; ramps with progress
  const flowScore = Math.max(0, Math.round(Math.min(100, pct) - interruptsRef.current * 18));

  return (
    <div className="min-h-screen relative overflow-hidden bg-velari-bg text-velari-text">
      {/* Ambient aurora background */}
      <div
        className="absolute inset-0 aurora"
        style={{ filter: `saturate(${1 + intensity * 0.2})` }}
      />
      <div className="absolute inset-0 grain opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-velari-bg/40 via-transparent to-velari-bg/30 pointer-events-none" />

      <div className="relative min-h-screen flex flex-col">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[10.5px] tracking-[0.22em] uppercase text-velari-textSoft">Focus Mode</div>
            {started && (
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-velari-brand/15 text-velari-brand">
                {INTENSITY[intensity].label} · {mode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted((m) => !m)}
              data-testid="focus-mute"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[12px] hover:bg-velari-surfaceAlt transition-colors"
              title={muted ? "Ambient off" : "Ambient on"}
            >
              {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              {muted ? "Silent" : "Ambient"}
            </button>
            <button
              onClick={exit}
              data-testid="focus-exit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[12px] hover:bg-velari-surfaceAlt transition-colors"
            >
              <X size={13} /> Exit
            </button>
          </div>
        </div>

        {!started ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="w-full max-w-xl text-center fade-up">
              <div className="text-[10.5px] tracking-[0.22em] uppercase text-velari-brand mb-5">
                A breath before you begin
              </div>
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

              <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setDuration(p.minutes);
                      setRemaining(p.minutes * 60);
                      setMode(p.mode);
                      setIntensity(p.intensity);
                    }}
                    data-testid={`focus-preset-${p.id}`}
                    className={`px-4 py-2 rounded-full text-[13px] border transition-all ease-velari ${
                      duration === p.minutes
                        ? "bg-velari-ink text-velari-cream border-velari-ink shadow-elevated"
                        : "bg-velari-surface border-velari-border hover:bg-velari-surfaceAlt"
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
                className="mt-10 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-velari-brand text-white text-[15px] font-medium hover:-translate-y-0.5 transition-transform ease-velari disabled:opacity-40 disabled:translate-y-0 shadow-elevated"
              >
                <Play size={15} /> Enter focus
              </button>
              <div className="mt-6 text-[12px] text-velari-textSoft">
                Velari will hold the door. Nothing will reach you.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center w-full max-w-2xl fade-up">
              <div className="text-[10.5px] tracking-[0.22em] uppercase text-velari-brand mb-3">
                Now focusing on
              </div>
              <div className="font-editorial italic text-2xl sm:text-3xl mb-10 max-w-xl mx-auto leading-snug">
                {intent}
              </div>

              <div className="relative mx-auto h-80 w-80">
                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                  <circle cx="50" cy="50" r="46" stroke="hsl(var(--velari-border))" strokeWidth="1" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    stroke="url(#focusGrad)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={Math.PI * 92}
                    strokeDashoffset={Math.PI * 92 * (1 - pct / 100)}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--velari-sage))" />
                      <stop offset="100%" stopColor="hsl(var(--velari-brand))" />
                    </linearGradient>
                  </defs>
                </svg>
                <div
                  className={`absolute inset-8 rounded-full ${running ? "breathe" : ""}`}
                  style={{
                    background: `radial-gradient(60% 60% at 50% 50%, hsl(var(--velari-brand) / ${INTENSITY[intensity].glow * 0.18}) 0%, transparent 80%)`,
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-7xl tracking-tight leading-none" data-testid="focus-timer">
                    {fmt(remaining)}
                  </div>
                  <div className="text-[10.5px] text-velari-textSoft mt-3 uppercase tracking-[0.22em]">
                    {running ? "in focus" : "paused"}
                  </div>
                </div>
              </div>

              {/* Micro progress feedback */}
              <div className="mt-10 mx-auto max-w-lg">
                <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">
                  <span>Flow</span>
                  <span data-testid="flow-score">{flowScore}</span>
                </div>
                <div className="h-1.5 rounded-full bg-velari-surfaceAlt overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-velari"
                    style={{
                      width: `${flowScore}%`,
                      background: "linear-gradient(90deg, hsl(var(--velari-sage)) 0%, hsl(var(--velari-brand)) 100%)",
                    }}
                  />
                </div>
                <div className="mt-2 text-[12px] text-velari-textSoft">
                  {interruptsRef.current === 0
                    ? running
                      ? "Uninterrupted. Stay with this."
                      : "Pick it up when you're ready."
                    : `${interruptsRef.current} attention shift${interruptsRef.current === 1 ? "" : "s"}. Notice. Return.`}
                </div>
              </div>

              <div className="mt-9 flex items-center justify-center gap-3">
                <button
                  onClick={() => setRunning((r) => !r)}
                  data-testid="focus-toggle"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-velari-ink text-velari-cream hover:-translate-y-0.5 transition-transform ease-velari shadow-elevated"
                >
                  {running ? <Pause size={15} /> : <Play size={15} />}
                  {running ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => { setRemaining(duration * 60); setRunning(false); interruptsRef.current = 0; }}
                  data-testid="focus-reset"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-velari-border bg-velari-surface hover:bg-velari-surfaceAlt"
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
