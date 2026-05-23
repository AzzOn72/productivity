import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Search,
  CheckCircle2,
  Sun,
  CalendarDays,
  Target,
  LineChart,
  Compass,
  BookOpen,
  Sparkles,
  Plus,
  Wand2,
  Moon,
  Heart,
  ArrowRight,
  Hash,
  FileText,
  CalendarClock,
} from "lucide-react";

const ACTIONS = [
  { id: "today", section: "Navigate", label: "Open Today", icon: Sun, path: "/today" },
  { id: "tasks", section: "Navigate", label: "Open Tasks", icon: CheckCircle2, path: "/tasks" },
  { id: "calendar", section: "Navigate", label: "Open Calendar", icon: CalendarDays, path: "/calendar" },
  { id: "focus", section: "Navigate", label: "Enter Focus Mode", icon: Target, path: "/focus" },
  { id: "review", section: "Navigate", label: "Weekly Review", icon: LineChart, path: "/review" },
  { id: "insights", section: "Navigate", label: "Insights & Patterns", icon: LineChart, path: "/insights" },
  { id: "goals", section: "Navigate", label: "Goals", icon: Compass, path: "/goals" },
  { id: "journal", section: "Navigate", label: "Journal", icon: BookOpen, path: "/journal" },

  { id: "now", section: "Magic", label: 'Ask "What should I do right now?"', icon: Sparkles, kind: "now" },
  { id: "autoplan", section: "Magic", label: "Auto-plan my day", icon: Wand2, kind: "autoplan" },
  { id: "capture", section: "Magic", label: "Quick capture (AI parsed)", icon: Plus, kind: "capture" },
  { id: "checkin", section: "Magic", label: "Mood & energy check-in", icon: Heart, kind: "checkin" },
  { id: "shutdown", section: "Magic", label: "Evening shutdown ritual", icon: Moon, kind: "shutdown" },
];

export default function CommandPalette({ open, onClose, onCheckin, onShutdown, onCapture, onNow }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setQ("");
      setResults(null);
    }
  }, [open]);

  // Live universal search (debounced)
  useEffect(() => {
    if (!open) return;
    const needle = q.trim();
    if (needle.length < 2) {
      setResults(null);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(needle)}`);
        setResults(data);
      } catch {}
    }, 180);
    return () => clearTimeout(handle);
  }, [q, open]);

  const filteredActions = useMemo(() => {
    if (!q.trim()) return ACTIONS;
    const needle = q.toLowerCase();
    return ACTIONS.filter((a) => a.label.toLowerCase().includes(needle));
  }, [q]);

  const groupedActions = useMemo(() => {
    const m = new Map();
    filteredActions.forEach((a) => {
      if (!m.has(a.section)) m.set(a.section, []);
      m.get(a.section).push(a);
    });
    return [...m.entries()];
  }, [filteredActions]);

  const runAction = async (a) => {
    if (a.path) { nav(a.path); onClose?.(); return; }
    if (a.kind === "autoplan") {
      setBusy(true);
      try {
        const { data } = await api.post("/ai/auto-plan");
        toast.success(data.message || `${data.created} block${data.created === 1 ? "" : "s"} arranged.`);
        nav("/today");
      } catch (e) { toast.error(formatApiError(e)); }
      finally { setBusy(false); onClose?.(); }
      return;
    }
    if (a.kind === "now") { onNow?.(); onClose?.(); return; }
    if (a.kind === "capture") { onCapture?.(); onClose?.(); nav("/today"); return; }
    if (a.kind === "checkin") { onCheckin?.(); onClose?.(); return; }
    if (a.kind === "shutdown") { onShutdown?.(); onClose?.(); return; }
  };

  const submitFreeText = async () => {
    const text = q.trim();
    if (!text) return;
    setBusy(true);
    try {
      await api.post("/tasks/quick-capture", { text });
      toast.success("Captured.");
      setQ("");
      onClose?.();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  const hasResults =
    results && ((results.tasks?.length || 0) + (results.goals?.length || 0) + (results.journal?.length || 0) + (results.events?.length || 0)) > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" data-testid="command-palette">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-3xl bg-velari-surface border border-velari-border shadow-elevated overflow-hidden fade-up">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-velari-border">
          <Search size={16} className="text-velari-textSoft" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (filteredActions[0]) runAction(filteredActions[0]);
                else if (!hasResults) submitFreeText();
              }
            }}
            placeholder="Search, jump, or capture…"
            data-testid="palette-input"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-velari-textSoft"
          />
          <span className="text-[10.5px] tracking-[0.18em] uppercase text-velari-textSoft hidden sm:block">Esc</span>
        </div>

        <div className="max-h-[55vh] overflow-y-auto py-2" data-testid="palette-list">
          {/* Search results from /api/search */}
          {hasResults && (
            <>
              {results.tasks.length > 0 && (
                <Group label="Tasks">
                  {results.tasks.map((t) => (
                    <ResultRow
                      key={t.task_id}
                      icon={CheckCircle2}
                      testid={`palette-result-task-${t.task_id}`}
                      label={t.title}
                      hint={t.completed ? "done" : t.scheduled_for || "open"}
                      onClick={() => { nav("/tasks"); onClose?.(); }}
                    />
                  ))}
                </Group>
              )}
              {results.goals.length > 0 && (
                <Group label="Goals">
                  {results.goals.map((g) => (
                    <ResultRow
                      key={g.goal_id}
                      icon={Compass}
                      testid={`palette-result-goal-${g.goal_id}`}
                      label={g.title}
                      hint={g.why}
                      onClick={() => { nav("/goals"); onClose?.(); }}
                    />
                  ))}
                </Group>
              )}
              {results.journal.length > 0 && (
                <Group label="Journal">
                  {results.journal.map((j) => (
                    <ResultRow
                      key={j.entry_id}
                      icon={FileText}
                      testid={`palette-result-journal-${j.entry_id}`}
                      label={(j.text || "").slice(0, 60)}
                      hint={new Date(j.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      onClick={() => { nav("/journal"); onClose?.(); }}
                    />
                  ))}
                </Group>
              )}
              {results.events.length > 0 && (
                <Group label="Calendar">
                  {results.events.map((e) => (
                    <ResultRow
                      key={e.event_id}
                      icon={CalendarClock}
                      testid={`palette-result-event-${e.event_id}`}
                      label={e.title}
                      hint={new Date(e.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      onClick={() => { nav("/calendar"); onClose?.(); }}
                    />
                  ))}
                </Group>
              )}
            </>
          )}

          {/* No search results and a query present -> capture fallback */}
          {!hasResults && q.trim().length >= 2 && filteredActions.length === 0 && (
            <button
              onClick={submitFreeText}
              data-testid="palette-capture-fallback"
              className="w-full text-left px-4 py-3 hover:bg-velari-surfaceAlt flex items-center gap-3"
            >
              <Plus size={14} className="text-velari-brand" />
              <span className="text-[14px]">Capture "<span className="font-display">{q}</span>"</span>
              <span className="ml-auto text-[11px] text-velari-textSoft">↵</span>
            </button>
          )}

          {/* Actions (filtered or full) */}
          {filteredActions.length > 0 && (
            <>
              {hasResults && <div className="h-px bg-velari-border my-1" />}
              {groupedActions.map(([section, items]) => (
                <Group key={section} label={section}>
                  {items.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.id}
                        onClick={() => runAction(a)}
                        disabled={busy}
                        data-testid={`palette-${a.id}`}
                        className="w-full text-left px-4 py-2.5 hover:bg-velari-surfaceAlt flex items-center gap-3 disabled:opacity-50 transition-colors"
                      >
                        <Icon size={14} className="text-velari-textSoft" />
                        <span className="text-[14px] flex-1">{a.label}</span>
                        <ArrowRight size={12} className="text-velari-textSoft" />
                      </button>
                    );
                  })}
                </Group>
              ))}
            </>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-velari-border text-[11px] text-velari-textSoft flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Hash size={11} /> Universal search
          </span>
          <span>⌘K to toggle · ↵ to run</span>
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }) {
  return (
    <div className="py-1">
      <div className="px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] text-velari-textSoft">{label}</div>
      {children}
    </div>
  );
}

function ResultRow({ icon: Icon, label, hint, testid, onClick }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className="w-full text-left px-4 py-2.5 hover:bg-velari-surfaceAlt flex items-center gap-3 transition-colors"
    >
      <Icon size={14} className="text-velari-textSoft" />
      <span className="text-[14px] flex-1 truncate">{label}</span>
      {hint && <span className="text-[11px] text-velari-textSoft truncate max-w-[40%]">{hint}</span>}
    </button>
  );
}
