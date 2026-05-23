import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Check,
  Trash2,
  Sparkles,
  Search,
  ChevronDown,
} from "lucide-react";

const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];
const ENERGY_OPTIONS = ["low", "medium", "high"];

const PRIORITY_DOT = {
  urgent: "bg-red-500",
  high: "bg-velari-brand",
  medium: "bg-velari-sage",
  low: "bg-velari-border",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("today");
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", notes: "", priority: "medium", estimated_minutes: 30, energy: "medium" });
  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    try {
      const { data } = await api.get("/tasks");
      setTasks(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = tasks;
    if (filter === "open") list = list.filter((t) => !t.completed);
    if (filter === "done") list = list.filter((t) => t.completed);
    if (filter === "today") list = list.filter((t) => (t.scheduled_for === today || t.due_date === today));
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(needle) || (t.notes || "").toLowerCase().includes(needle));
    }
    return list;
  }, [tasks, filter, q, today]);

  const toggle = async (t) => {
    setTasks((arr) => arr.map((x) => x.task_id === t.task_id ? { ...x, completed: !x.completed } : x));
    try { await api.patch(`/tasks/${t.task_id}`, { completed: !t.completed }); }
    catch (e) { toast.error(formatApiError(e)); load(); }
  };

  const remove = async (t) => {
    setTasks((arr) => arr.filter((x) => x.task_id !== t.task_id));
    try { await api.delete(`/tasks/${t.task_id}`); }
    catch (e) { toast.error(formatApiError(e)); load(); }
  };

  const add = async (e) => {
    e?.preventDefault?.();
    if (!draft.title.trim()) return;
    try {
      const { data } = await api.post("/tasks", { ...draft, scheduled_for: today });
      setTasks((arr) => [data, ...arr]);
      setDraft({ title: "", notes: "", priority: "medium", estimated_minutes: 30, energy: "medium" });
      setShowAdd(false);
      toast.success("Added to today.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const updatePriority = async (t, priority) => {
    setTasks((arr) => arr.map((x) => x.task_id === t.task_id ? { ...x, priority } : x));
    try { await api.patch(`/tasks/${t.task_id}`, { priority }); } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="px-5 md:px-10 py-8 max-w-[1200px] mx-auto pb-28">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 fade-up">
        <div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">Tasks</div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight">Everything, in one quiet list.</h1>
          <p className="text-velari-textSoft mt-2 text-[15px]">Capture, sort, complete. No anxiety bait.</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          data-testid="new-task-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-velari-ink text-velari-cream hover:-translate-y-0.5 transition-transform ease-velari"
        >
          <Plus size={15} /> New task
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={add}
          className="rounded-2xl border border-velari-border bg-velari-surface p-5 mb-6 fade-up"
          data-testid="task-form"
        >
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="What needs your attention?"
            autoFocus
            data-testid="task-title"
            className="w-full bg-transparent text-[18px] font-display tracking-tight focus:outline-none placeholder:text-velari-textSoft"
          />
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Add a note (optional)"
            rows={2}
            data-testid="task-notes"
            className="mt-2 w-full bg-transparent text-[14px] focus:outline-none placeholder:text-velari-textSoft resize-none"
          />
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Select
              value={draft.priority}
              onChange={(v) => setDraft({ ...draft, priority: v })}
              options={PRIORITY_OPTIONS}
              label="Priority"
              testid="task-priority"
            />
            <Select
              value={draft.energy}
              onChange={(v) => setDraft({ ...draft, energy: v })}
              options={ENERGY_OPTIONS}
              label="Energy"
              testid="task-energy"
            />
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-velari-border bg-velari-bg text-[12.5px]">
              <span className="text-velari-textSoft">Est.</span>
              <input
                type="number"
                min={5}
                max={300}
                step={5}
                value={draft.estimated_minutes}
                onChange={(e) => setDraft({ ...draft, estimated_minutes: parseInt(e.target.value) || 30 })}
                className="w-12 bg-transparent text-center focus:outline-none"
                data-testid="task-estimate"
              />
              <span className="text-velari-textSoft">min</span>
            </div>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-2 rounded-full text-[13px] text-velari-textSoft hover:text-velari-text">Cancel</button>
              <button type="submit" data-testid="task-save" className="px-4 py-2 rounded-full text-[13px] bg-velari-ink text-velari-cream">Save</button>
            </div>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-1.5 bg-velari-surface border border-velari-border rounded-full p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              data-testid={`filter-${f.id}`}
              className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors ${
                filter === f.id ? "bg-velari-ink text-velari-cream" : "text-velari-textSoft hover:text-velari-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-md relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-velari-textSoft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            data-testid="task-search"
            className="w-full h-10 pl-10 pr-3 rounded-full bg-velari-surface border border-velari-border text-[14px] focus:outline-none focus:ring-2 focus:ring-velari-brand/40"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-velari-border bg-velari-surface overflow-hidden">
        {filtered.length === 0 && (
          <div className="p-10 text-center text-velari-textSoft">
            <div className="font-editorial italic text-2xl mb-2">A clean slate.</div>
            <div className="text-[14px]">Add the smallest meaningful thing.</div>
          </div>
        )}
        <ul className="divide-y divide-velari-border">
          {filtered.map((t) => (
            <li key={t.task_id} className="px-4 sm:px-5 py-3 flex items-center gap-3 group" data-testid={`tasks-row-${t.task_id}`}>
              <button
                onClick={() => toggle(t)}
                data-testid={`tasks-toggle-${t.task_id}`}
                className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                  t.completed ? "bg-velari-brand border-velari-brand" : "border-velari-border hover:border-velari-text"
                }`}
              >
                {t.completed && <Check size={12} className="text-white pop" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-[14.5px] truncate ${t.completed ? "line-through text-velari-textSoft" : ""}`}>{t.title}</div>
                {t.notes && <div className="text-[12px] text-velari-textSoft truncate">{t.notes}</div>}
              </div>
              <div className="flex items-center gap-3">
                <PriorityPill task={t} onChange={updatePriority} />
                <div className="text-[12px] text-velari-textSoft w-14 text-right">{t.estimated_minutes}m</div>
                <button onClick={() => remove(t)} data-testid={`tasks-delete-${t.task_id}`} className="opacity-0 group-hover:opacity-100 text-velari-textSoft hover:text-red-600 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Select({ value, onChange, options, label, testid }) {
  return (
    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-velari-border bg-velari-bg text-[12.5px]" data-testid={testid}>
      <span className="text-velari-textSoft">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent capitalize focus:outline-none pr-1"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function PriorityPill({ task, onChange }) {
  return (
    <div className="relative">
      <select
        value={task.priority}
        onChange={(e) => onChange(task, e.target.value)}
        data-testid={`priority-${task.task_id}`}
        className="appearance-none pl-5 pr-6 py-1 rounded-full text-[11.5px] capitalize bg-velari-surfaceAlt border border-velari-border focus:outline-none"
      >
        {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <span className={`absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-velari-textSoft pointer-events-none" />
    </div>
  );
}
