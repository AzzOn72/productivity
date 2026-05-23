import { useEffect, useState, useMemo } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Sparkles,
  Sun,
  Cloud,
  Moon,
  Target,
  Check,
  ArrowRight,
  CircleDot,
  Wind,
  Flame,
  Leaf,
  ChevronRight,
} from "lucide-react";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const longDate = () =>
  new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

const ENERGIES = [
  { id: "low", label: "Quiet", icon: Cloud },
  { id: "medium", label: "Steady", icon: Sun },
  { id: "high", label: "Vivid", icon: Flame },
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

  const date = todayISO();

  const load = async () => {
    try {
      const [t, h, f] = await Promise.all([
        api.get(`/tasks?day=${date}`),
        api.get("/habits"),
        api.get("/focus/today"),
      ]);
      setTasks(t.data);
      setHabits(h.data);
      setFocusTotal(f.data.total_minutes || 0);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  const orderedOpen = useMemo(() => {
    if (!aiOrder) return open;
    const map = new Map(open.map((t) => [t.task_id, t]));
    const ordered = aiOrder.map((id) => map.get(id)).filter(Boolean);
    const rest = open.filter((t) => !aiOrder.includes(t.task_id));
    return [...ordered, ...rest];
  }, [open, aiOrder]);

  const total = tasks.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  const toggle = async (t) => {
    setTasks((ts) => ts.map((x) => (x.task_id === t.task_id ? { ...x, completed: !x.completed } : x)));
    try {
      await api.patch(`/tasks/${t.task_id}`, { completed: !t.completed });
      if (!t.completed) toast.success("Done. One quieter step.");
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

  const checkHabit = async (h) => {
    setHabits((arr) =>
      arr.map((x) =>
        x.habit_id === h.habit_id ? { ...x, checked_today: !x.checked_today, streak: x.checked_today ? Math.max(0, x.streak - 1) : x.streak + 1 } : x,
      ),
    );
    try {
      await api.post(`/habits/${h.habit_id}/check`, { date });
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

  return (
    <div className="px-5 md:px-10 py-8 max-w-[1400px] mx-auto pb-28">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 fade-up">
        <div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">{longDate()}</div>
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

        <div className="flex items-center gap-2 rounded-full bg-velari-surface border border-velari-border p-1.5">
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
      </div>

      {/* North star strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7 fade-up">
        <Stat label="Today's clarity" value={`${pct}%`} hint={`${done.length} of ${total || 0} done`} />
        <Stat label="Focus today" value={`${Math.floor(focusTotal / 60)}h ${focusTotal % 60}m`} hint="quiet, accumulated" />
        <Stat label="Habit streak" value={`${habits.reduce((a, h) => a + (h.streak || 0), 0)}d`} hint={`${habits.length} habits`} />
        <Stat label="Plan" value={(user?.plan || "free").toUpperCase()} hint={user?.plan === "free" ? "upgrade to Pro" : "Thank you"} link={user?.plan === "free" ? "/pricing" : undefined} />
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 1: Habits + Energy + Quick capture */}
        <div className="lg:col-span-3 space-y-5 fade-up">
          <Panel>
            <PanelHeader title="Habits" action={<button onClick={createHabit} className="text-velari-textSoft hover:text-velari-text" data-testid="add-habit-btn"><Plus size={15} /></button>} />
            {habits.length === 0 && <Empty text="No habits yet. Start with one. Make it tiny." />}
            <div className="space-y-2">
              {habits.map((h) => (
                <button
                  key={h.habit_id}
                  onClick={() => checkHabit(h)}
                  data-testid={`habit-${h.habit_id}`}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-velari-surfaceAlt transition-colors text-left"
                >
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center border ${h.checked_today ? "bg-velari-brand border-velari-brand pop" : "border-velari-border"}`}>
                    {h.checked_today ? <Check size={13} className="text-white" /> : <Leaf size={13} className="text-velari-textSoft" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] truncate">{h.name}</div>
                    <div className="text-[11px] text-velari-textSoft">{h.streak > 0 ? `${h.streak} day streak` : "Begin today"}</div>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Quick capture" />
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
                data-testid="quick-capture-submit"
                disabled={!quick.trim()}
                className="mt-2 w-full h-9 rounded-xl bg-velari-ink text-velari-cream text-[13.5px] flex items-center justify-center gap-1.5 disabled:opacity-40 hover:-translate-y-0.5 transition-transform ease-velari"
              >
                <Sparkles size={13} /> Capture
              </button>
            </form>
          </Panel>
        </div>

        {/* Col 2: Today's Priorities */}
        <div className="lg:col-span-6 fade-up">
          <Panel>
            <PanelHeader
              title="Today"
              action={
                <button
                  onClick={prioritize}
                  disabled={busyAI || open.length === 0}
                  data-testid="ai-prioritize-btn"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-velari-text bg-velari-surfaceAlt hover:bg-velari-border transition-colors disabled:opacity-40"
                >
                  <Sparkles size={12} className="text-velari-brand" />
                  {busyAI ? "Thinking…" : "AI prioritize"}
                </button>
              }
            />

            {aiReason && (
              <div className="mb-4 rounded-xl bg-velari-brand/8 border border-velari-brand/25 p-3.5 text-[13px] text-velari-text leading-relaxed">
                <span className="text-[10px] uppercase tracking-[0.2em] text-velari-brand block mb-1">Velari said</span>
                {aiReason}
              </div>
            )}

            {open.length === 0 && done.length === 0 && (
              <Empty text="Today is open. What is the smallest thing that would feel meaningful?" />
            )}

            <ul className="space-y-1.5">
              {orderedOpen.map((t, i) => (
                <TaskRow key={t.task_id} task={t} idx={i + 1} onToggle={() => toggle(t)} />
              ))}
            </ul>

            {done.length > 0 && (
              <div className="mt-6">
                <div className="text-[11px] uppercase tracking-[0.18em] text-velari-textSoft mb-2">Quiet wins</div>
                <ul className="space-y-1">
                  {done.map((t) => (
                    <TaskRow key={t.task_id} task={t} onToggle={() => toggle(t)} muted />
                  ))}
                </ul>
              </div>
            )}

            <Link to="/tasks" data-testid="see-all-tasks" className="mt-5 inline-flex items-center gap-1 text-[13px] text-velari-textSoft hover:text-velari-text">
              See all tasks <ChevronRight size={14} />
            </Link>
          </Panel>
        </div>

        {/* Col 3: Schedule + Focus */}
        <div className="lg:col-span-3 space-y-5 fade-up">
          <Panel>
            <PanelHeader title="Schedule" action={<Link to="/calendar" className="text-velari-textSoft hover:text-velari-text" data-testid="open-cal"><ChevronRight size={15} /></Link>} />
            <Schedule />
          </Panel>

          <div className="rounded-2xl border border-velari-border bg-velari-ink text-velari-cream p-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-velari-brand/40 blur-2xl pointer-events-none" />
            <Target size={18} className="opacity-80 mb-3" />
            <div className="font-display text-lg leading-tight">Enter focus.</div>
            <div className="text-[12.5px] opacity-75 mt-1 mb-4">One task. One timer. One breath.</div>
            <Link
              to="/focus"
              data-testid="enter-focus-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-velari-cream text-velari-ink text-[13px] font-medium hover:-translate-y-0.5 transition-transform ease-velari"
            >
              Begin <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ children }) {
  return <div className="rounded-2xl border border-velari-border bg-velari-surface p-5">{children}</div>;
}

function PanelHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display text-[15px] tracking-tight uppercase text-velari-textSoft" style={{ letterSpacing: "0.18em" }}>{title}</h3>
      {action}
    </div>
  );
}

function Empty({ text }) {
  return <div className="text-[13px] text-velari-textSoft italic font-editorial leading-relaxed py-2">{text}</div>;
}

function Stat({ label, value, hint, link }) {
  const inner = (
    <div className="rounded-2xl border border-velari-border bg-velari-surface p-5 h-full flex flex-col justify-between">
      <div className="text-[11px] uppercase tracking-[0.18em] text-velari-textSoft">{label}</div>
      <div>
        <div className="font-display text-3xl tracking-tight">{value}</div>
        <div className="text-[12px] text-velari-textSoft mt-1">{hint}</div>
      </div>
    </div>
  );
  if (link) return <Link to={link} data-testid="stat-link" className="hover:-translate-y-0.5 transition-transform ease-velari">{inner}</Link>;
  return inner;
}

function TaskRow({ task, idx, onToggle, muted }) {
  return (
    <li
      data-testid={`task-row-${task.task_id}`}
      className={`group flex items-center gap-3 p-2.5 rounded-xl hover:bg-velari-surfaceAlt/60 transition-colors`}
    >
      {idx && <div className="font-display text-[11px] w-5 text-velari-textSoft">{String(idx).padStart(2, "0")}</div>}
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
        <div className={`text-[14.5px] truncate ${task.completed ? "line-through text-velari-textSoft" : ""} ${muted ? "text-velari-textSoft" : ""}`}>
          {task.title}
        </div>
        {task.notes && !task.completed && <div className="text-[12px] text-velari-textSoft truncate">{task.notes}</div>}
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

function Schedule() {
  // Stylized day arc — illustrative timeline based on the hour
  const now = new Date();
  const hr = now.getHours();
  const blocks = [
    { t: "06–09", label: "Slow start", done: hr >= 9 },
    { t: "09–12", label: "Deep work", done: hr >= 12 },
    { t: "12–13", label: "Lunch & walk", done: hr >= 13 },
    { t: "13–16", label: "Meetings", done: hr >= 16 },
    { t: "16–18", label: "Wrap up", done: hr >= 18 },
    { t: "18–22", label: "Shutdown & life", done: hr >= 22 },
  ];
  return (
    <ul className="space-y-2.5">
      {blocks.map((b) => {
        const active = !b.done && hr >= parseInt(b.t.slice(0, 2));
        return (
          <li key={b.t} className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${active ? "bg-velari-brand animate-pulse" : b.done ? "bg-velari-border" : "bg-velari-sage/50"}`} />
            <div className="text-[11px] font-display text-velari-textSoft w-14">{b.t}</div>
            <div className={`text-[13.5px] ${active ? "text-velari-text font-medium" : b.done ? "line-through text-velari-textSoft" : ""}`}>{b.label}</div>
          </li>
        );
      })}
    </ul>
  );
}
