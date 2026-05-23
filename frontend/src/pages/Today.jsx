import { useEffect, useMemo, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Sparkles,
  Sun,
  Cloud,
  Flame as FlameIcon,
  Target,
  Check,
  ArrowRight,
  Leaf,
  ChevronRight,
  Moon,
  Wand2,
  CalendarClock,
  Zap,
} from "lucide-react";
import ClarityScore from "@/components/ClarityScore";
import MomentumBar from "@/components/MomentumBar";
import StreakBadge from "@/components/StreakBadge";
import OverloadBanner from "@/components/OverloadBanner";
import MorningRitual from "@/components/MorningRitual";
import ShutdownRitual from "@/components/ShutdownRitual";
import NowCard from "@/components/NowCard";
import NudgesStrip from "@/components/NudgesStrip";
import MoodCheckIn from "@/components/MoodCheckIn";

const todayISO = () => new Date().toISOString().slice(0, 10);
const longDate = () =>
  new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const ENERGIES = [
  { id: "low", label: "Quiet", icon: Cloud },
  { id: "medium", label: "Steady", icon: Sun },
  { id: "high", label: "Vivid", icon: FlameIcon },
];

const PRIORITY_DOT = {
  urgent: "bg-red-500",
  high: "bg-velari-brand",
  medium: "bg-velari-sage",
  low: "bg-velari-border",
};

export default function Today() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [focusTotal, setFocusTotal] = useState(0);
  const [aiOrder, setAiOrder] = useState(null);
  const [aiReason, setAiReason] = useState("");
  const [energy, setEnergy] = useState("medium");
  const [quick, setQuick] = useState("");
  const [busyAI, setBusyAI] = useState(false);
  const [busyPlan, setBusyPlan] = useState(false);
  const [overload, setOverload] = useState(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [momentum, setMomentum] = useState({ score: 0, label: "Quiet", components: { tasks: 0, focus: 0, habits: 0 } });
  const [events, setEvents] = useState([]);
  const [showMorning, setShowMorning] = useState(false);
  const [showShutdown, setShowShutdown] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [params, setParams] = useSearchParams();

  const date = todayISO();
  const capacity = (user?.daily_capacity || 4) * 60;

  const load = useCallback(async () => {
    try {
      const [t, h, f, m, s, ov, ev] = await Promise.all([
        api.get(`/tasks?day=${date}`),
        api.get("/habits"),
        api.get("/focus/today"),
        api.get("/momentum"),
        api.get("/streak"),
        api.get("/ai/overload-check"),
        api.get("/events"),
      ]);
      setTasks(t.data);
      setHabits(h.data);
      setFocusTotal(f.data.total_minutes || 0);
      setMomentum(m.data);
      setStreak(s.data);
      setOverload(ov.data);
      setEvents(ev.data.filter((e) => new Date(e.start).toDateString() === new Date().toDateString()));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // React to command-palette intents passed via URL
  useEffect(() => {
    if (params.get("shutdown")) { setShowShutdown(true); params.delete("shutdown"); setParams(params, { replace: true }); }
    if (params.get("checkin")) { setShowCheckin(true); params.delete("checkin"); setParams(params, { replace: true }); }
    if (params.get("capture")) {
      params.delete("capture"); setParams(params, { replace: true });
      const el = document.querySelector('[data-testid="quick-capture-input"]');
      if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
    }
    // 'now' just brings the user to Today; NowCard is already visible
    if (params.get("now")) { params.delete("now"); setParams(params, { replace: true }); }
  }, [params, setParams]);

  // Morning ritual trigger: before noon, fresh visit, not yet planned
  useEffect(() => {
    const key = `velari_morning_${date}`;
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(key);
    const h = new Date().getHours();
    if (!seen && h < 12 && (user?.onboarded ?? false)) {
      const timer = setTimeout(() => {
        setShowMorning(true);
        window.localStorage.setItem(key, "1");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [date, user]);

  const open = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  // Top 3 — prefer AI order, otherwise priority then estimated_minutes desc
  const topThree = useMemo(() => {
    if (aiOrder && aiOrder.length) {
      const map = new Map(open.map((t) => [t.task_id, t]));
      return aiOrder.map((id) => map.get(id)).filter(Boolean).slice(0, 3);
    }
    const pr = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...open]
      .sort((a, b) => (pr[a.priority] ?? 2) - (pr[b.priority] ?? 2) || (b.estimated_minutes || 0) - (a.estimated_minutes || 0))
      .slice(0, 3);
  }, [open, aiOrder]);

  const restOpen = useMemo(() => {
    const topIds = new Set(topThree.map((t) => t.task_id));
    return open.filter((t) => !topIds.has(t.task_id));
  }, [open, topThree]);

  const total = tasks.length;

  const toggle = async (t) => {
    setTasks((ts) => ts.map((x) => (x.task_id === t.task_id ? { ...x, completed: !x.completed } : x)));
    try {
      await api.patch(`/tasks/${t.task_id}`, { completed: !t.completed });
      if (!t.completed) toast.success("Done. One quieter step.");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
      load();
    }
  };

  const submitQuick = async (e) => {
    e.preventDefault();
    if (!quick.trim()) return;
    const text = quick;
    setQuick("");
    try {
      const { data } = await api.post("/tasks/quick-capture", { text });
      setTasks((ts) => [data, ...ts]);
      toast.success("Captured.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const prioritize = async () => {
    setBusyAI(true);
    try {
      const { data } = await api.post("/ai/prioritize");
      setAiOrder(data.order || []);
      setAiReason(data.reasoning || "");
      toast.success("Velari shaped your order.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusyAI(false);
    }
  };

  const autoPlan = async () => {
    setBusyPlan(true);
    try {
      const { data } = await api.post("/ai/auto-plan");
      toast.success(`${data.created} focus block${data.created === 1 ? "" : "s"} arranged.`);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusyPlan(false);
    }
  };

  const shiftOverload = async () => {
    // Move the lowest-priority open task to tomorrow
    const pr = { urgent: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...open].sort((a, b) => (pr[b.priority] ?? 2) - (pr[a.priority] ?? 2));
    const victim = sorted[0];
    if (!victim) return;
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    try {
      await api.patch(`/tasks/${victim.task_id}`, { scheduled_for: tomorrow.toISOString().slice(0, 10) });
      toast.success(`Moved "${victim.title}" to tomorrow.`);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const checkHabit = async (h) => {
    setHabits((arr) =>
      arr.map((x) =>
        x.habit_id === h.habit_id
          ? { ...x, checked_today: !x.checked_today, streak: x.checked_today ? Math.max(0, x.streak - 1) : x.streak + 1 }
          : x,
      ),
    );
    try {
      await api.post(`/habits/${h.habit_id}/check`, { date });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
      load();
    }
  };

  const createHabit = async () => {
    const name = window.prompt("What gentle habit?");
    if (!name) return;
    try {
      const { data } = await api.post("/habits", { name });
      setHabits((arr) => [...arr, data]);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const energySuggestion = useMemo(() => {
    if (!topThree.length) return null;
    const mapHr = (e) =>
      e === "high" ? "9–11" : e === "medium" ? "11–13" : "15–17";
    return topThree.map((t, i) => ({ ...t, window: mapHr(t.energy) }));
  }, [topThree]);

  return (
    <div className="px-5 md:px-10 py-8 max-w-[1400px] mx-auto pb-28">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7 fade-up">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-velari-textSoft mb-2 flex items-center gap-2">
            {longDate()}
            <StreakBadge current={streak.current} longest={streak.longest} compact />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
            {greeting()},{" "}
            <span className="font-editorial italic text-velari-brand">
              {user?.name?.split(" ")[0] || "friend"}.
            </span>
          </h1>
          <p className="text-velari-textSoft mt-2 text-[15px] max-w-xl">
            Three things matter. Move one of them, and today will feel like progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-velari-surface border border-velari-border p-1">
            {ENERGIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setEnergy(id)}
                data-testid={`energy-${id}`}
                className={`px-3 py-1.5 rounded-full text-[12.5px] flex items-center gap-1.5 transition-colors ${
                  energy === id ? "bg-velari-ink text-velari-cream" : "text-velari-textSoft hover:text-velari-text"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowShutdown(true)}
            data-testid="shutdown-trigger"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-velari-border bg-velari-surface text-[12.5px] hover:bg-velari-surfaceAlt transition-colors"
          >
            <Moon size={13} /> Shutdown
          </button>
        </div>
      </div>

      {/* Smart nudges strip */}
      <div className="mb-5 fade-up">
        <NudgesStrip
          onCheckin={() => setShowCheckin(true)}
          onShutdown={() => setShowShutdown(true)}
          onCapture={() => {
            const el = document.querySelector('[data-testid="quick-capture-input"]');
            if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
          }}
        />
      </div>

      {/* Hero: Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6 fade-up">
        <div className="lg:col-span-8 card-soft elevated p-6 sm:p-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ClarityScore
              done={done.length}
              total={total}
              focusMinutes={focusTotal}
              capacityMinutes={capacity}
            />
            <div className="flex flex-col justify-center gap-4">
              <MomentumBar score={momentum.score} label={momentum.label} components={momentum.components} />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={autoPlan}
                  disabled={busyPlan || open.length === 0}
                  data-testid="auto-plan-btn"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-velari-ink text-velari-cream text-[13px] disabled:opacity-40 hover:-translate-y-0.5 transition-transform ease-velari"
                >
                  <Wand2 size={13} /> {busyPlan ? "Arranging…" : "Auto-plan my day"}
                </button>
                <button
                  onClick={prioritize}
                  disabled={busyAI || open.length === 0}
                  data-testid="ai-prioritize-btn"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-velari-surfaceAlt border border-velari-border text-[12.5px] hover:bg-velari-border/40 disabled:opacity-40 transition-colors"
                >
                  <Sparkles size={12} className="text-velari-brand" />
                  {busyAI ? "Thinking…" : "AI reorder"}
                </button>
              </div>
            </div>
          </div>

          {overload && overload.overloaded && (
            <div className="mt-5">
              <OverloadBanner data={overload} onShift={shiftOverload} />
            </div>
          )}
        </div>

        <Link
          to="/focus"
          data-testid="enter-focus-card"
          className="lg:col-span-4 group rounded-2xl border border-velari-ink/90 bg-velari-ink text-velari-cream p-6 relative overflow-hidden flex flex-col justify-between min-h-[200px] hover:-translate-y-1 transition-transform ease-velari shadow-elevated"
        >
          <div className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-velari-brand/35 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-velari-sage/25 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-velari-cream/80" />
              <span className="text-[10.5px] uppercase tracking-[0.22em] opacity-70">Focus mode</span>
            </div>
            <div className="font-display text-2xl tracking-tight leading-tight">
              One task. One breath.
            </div>
            <p className="text-[13px] opacity-70 mt-2 max-w-xs">
              Cinematic deep work. Ambient gradient, soft countdown, flow indicator.
            </p>
          </div>
          <div className="relative inline-flex items-center gap-1.5 text-[13px] font-medium opacity-90 group-hover:opacity-100">
            Begin a session <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* "What now?" — the magical single-action prompt */}
      <div className="mb-6 fade-up">
        <NowCard />
      </div>

      {/* Top 3 — iconic priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-8 fade-up">
          <div className="card-soft elevated p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">Top three</div>
                <h3 className="font-display text-[22px] tracking-tight">Today's priorities</h3>
              </div>
              <Link to="/tasks" data-testid="see-all-tasks" className="text-[12.5px] text-velari-textSoft hover:text-velari-text inline-flex items-center gap-1">
                All tasks <ChevronRight size={13} />
              </Link>
            </div>

            {aiReason && (
              <div className="mb-5 rounded-xl bg-velari-brand/8 border border-velari-brand/20 px-4 py-3 text-[13.5px] text-velari-text leading-relaxed">
                <span className="text-[10px] uppercase tracking-[0.22em] text-velari-brand block mb-1">Velari said</span>
                {aiReason}
              </div>
            )}

            {topThree.length === 0 ? (
              <Empty text="Today is open. What is the smallest thing that would feel meaningful?" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topThree.map((t, i) => (
                  <TopCard key={t.task_id} idx={i + 1} task={t} onToggle={() => toggle(t)} />
                ))}
              </div>
            )}

            {restOpen.length > 0 && (
              <div className="mt-7">
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">Also today</div>
                <ul className="space-y-1">
                  {restOpen.map((t) => (
                    <TaskRow key={t.task_id} task={t} onToggle={() => toggle(t)} />
                  ))}
                </ul>
              </div>
            )}

            {done.length > 0 && (
              <div className="mt-6">
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">Quiet wins</div>
                <ul className="space-y-1">
                  {done.map((t) => (
                    <TaskRow key={t.task_id} task={t} onToggle={() => toggle(t)} muted />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Right column: energy schedule + habits + quick capture */}
        <aside className="lg:col-span-4 space-y-5 fade-up">
          <MoodCheckIn />
          <div className="card-soft elevated p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">Energy schedule</div>
              <Link to="/calendar" data-testid="open-cal" className="text-velari-textSoft hover:text-velari-text"><CalendarClock size={14} /></Link>
            </div>
            {energySuggestion && energySuggestion.length > 0 ? (
              <ul className="space-y-2.5">
                {energySuggestion.map((t) => (
                  <li key={t.task_id} className="flex items-center gap-3" data-testid={`energy-row-${t.task_id}`}>
                    <div className={`h-2 w-2 rounded-full ${PRIORITY_DOT[t.priority] || PRIORITY_DOT.medium}`} />
                    <div className="text-[11px] font-display text-velari-textSoft w-12">{t.window}</div>
                    <div className="text-[13.5px] truncate flex-1">{t.title}</div>
                    <Zap size={11} className={`${t.energy === "high" ? "text-velari-brand" : t.energy === "medium" ? "text-velari-sage" : "text-velari-textSoft"}`} />
                  </li>
                ))}
                {events.length > 0 && (
                  <li className="pt-2 border-t border-velari-border/60 mt-3">
                    <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">Held on calendar</div>
                    {events.slice(0, 3).map((ev) => (
                      <div key={ev.event_id} className="flex items-center gap-2 text-[13px] py-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${ev.kind === "focus" ? "bg-velari-brand" : "bg-velari-sage"}`} />
                        <div className="text-[11px] font-display text-velari-textSoft w-12">
                          {new Date(ev.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </div>
                        <div className="truncate flex-1">{ev.title}</div>
                      </div>
                    ))}
                  </li>
                )}
              </ul>
            ) : (
              <Empty text="Once you have tasks, your day will arrange itself." />
            )}
          </div>

          <div className="card-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">Habits</div>
              <button onClick={createHabit} className="text-velari-textSoft hover:text-velari-text" data-testid="add-habit-btn">
                <Plus size={14} />
              </button>
            </div>
            {habits.length === 0 ? (
              <Empty text="No habits yet. Start with one — make it tiny." />
            ) : (
              <div className="space-y-2">
                {habits.map((h) => (
                  <button
                    key={h.habit_id}
                    onClick={() => checkHabit(h)}
                    data-testid={`habit-${h.habit_id}`}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-velari-surfaceAlt transition-colors text-left"
                  >
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center border transition-colors ${
                        h.checked_today ? "bg-velari-brand border-velari-brand pop" : "border-velari-border"
                      }`}
                    >
                      {h.checked_today ? <Check size={13} className="text-white" /> : <Leaf size={12} className="text-velari-textSoft" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] truncate">{h.name}</div>
                      <div className="text-[11px] text-velari-textSoft">
                        {h.streak > 0 ? `${h.streak} day streak` : "Begin today"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card-soft p-6">
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mb-3">Quick capture</div>
            <form onSubmit={submitQuick}>
              <textarea
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
                placeholder="Whatever's on your mind. Velari will shape it."
                rows={3}
                data-testid="quick-capture-input"
                className="w-full bg-velari-bg border border-velari-border rounded-xl p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-velari-brand/40 resize-none"
              />
              <button
                type="submit"
                disabled={!quick.trim()}
                data-testid="quick-capture-submit"
                className="mt-2 w-full h-9 rounded-xl bg-velari-ink text-velari-cream text-[13.5px] flex items-center justify-center gap-1.5 disabled:opacity-40 hover:-translate-y-0.5 transition-transform ease-velari"
              >
                <Sparkles size={13} /> Capture
              </button>
            </form>
          </div>
        </aside>
      </div>

      <MorningRitual
        open={showMorning}
        onClose={() => setShowMorning(false)}
        onPlanned={() => load()}
        defaultIntention={topThree[0]?.title || ""}
      />
      <ShutdownRitual open={showShutdown} onClose={() => setShowShutdown(false)} onSaved={() => load()} />

      {showCheckin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="checkin-modal">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCheckin(false)} />
          <div className="relative w-full max-w-md fade-up">
            <MoodCheckIn open onClose={() => setShowCheckin(false)} onSaved={() => setShowCheckin(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="text-[13.5px] text-velari-textSoft italic font-editorial leading-relaxed py-2">{text}</div>
  );
}

function TopCard({ idx, task, onToggle }) {
  return (
    <div
      data-testid={`top-card-${task.task_id}`}
      className="group rounded-2xl border border-velari-border bg-gradient-to-br from-velari-surface to-velari-surfaceAlt/40 p-5 flex flex-col gap-3 hover:-translate-y-1 transition-all ease-velari hover:shadow-soft"
    >
      <div className="flex items-center justify-between">
        <div className="font-display text-[11px] text-velari-textSoft tracking-[0.18em]">
          {String(idx).padStart(2, "0")}
        </div>
        <button
          onClick={onToggle}
          data-testid={`top-toggle-${task.task_id}`}
          className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
            task.completed ? "bg-velari-brand border-velari-brand" : "border-velari-border hover:border-velari-text"
          }`}
        >
          {task.completed && <Check size={13} className="text-white pop" />}
        </button>
      </div>
      <div className={`font-display text-[17px] leading-snug tracking-tight ${task.completed ? "line-through text-velari-textSoft" : ""}`}>
        {task.title}
      </div>
      <div className="mt-auto flex items-center justify-between text-[11.5px] text-velari-textSoft">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium}`} />
          <span className="capitalize">{task.priority}</span>
        </div>
        <span>{task.estimated_minutes}m</span>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, muted }) {
  return (
    <li
      data-testid={`task-row-${task.task_id}`}
      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-velari-surfaceAlt/60 transition-colors"
    >
      <button
        onClick={onToggle}
        data-testid={`toggle-${task.task_id}`}
        className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
          task.completed ? "bg-velari-brand border-velari-brand" : "border-velari-border hover:border-velari-text"
        }`}
      >
        {task.completed && <Check size={12} className="text-white pop" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] truncate ${task.completed ? "line-through text-velari-textSoft" : ""} ${muted ? "text-velari-textSoft" : ""}`}>
          {task.title}
        </div>
      </div>
      {!task.completed && (
        <div className="flex items-center gap-2 text-[11px] text-velari-textSoft">
          <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium}`} />
          <span>{task.estimated_minutes}m</span>
        </div>
      )}
    </li>
  );
}
