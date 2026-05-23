import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Compass, Plus, Trash2, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";

const COLORS = ["#C86B52", "#7B8B7B", "#8E7B69", "#5A6F7F", "#A86E80", "#6E7F5E"];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ title: "", why: "", weight: 5, color: COLORS[0] });

  const load = async () => {
    try {
      const { data } = await api.get("/goals");
      setGoals(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const totalWeight = goals.reduce((a, g) => a + (g.weight || 5), 0);

  const create = async (e) => {
    e?.preventDefault?.();
    if (!draft.title.trim()) return;
    try {
      const { data } = await api.post("/goals", draft);
      setGoals((arr) => [data, ...arr]);
      setDraft({ title: "", why: "", weight: 5, color: COLORS[0] });
      setShowForm(false);
      toast.success("Goal named. Velari will guard it.");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const updateWeight = async (g, weight) => {
    setGoals((arr) => arr.map((x) => x.goal_id === g.goal_id ? { ...x, weight } : x));
    try { await api.patch(`/goals/${g.goal_id}`, { weight }); }
    catch (e) { toast.error(formatApiError(e)); load(); }
  };

  const remove = async (g) => {
    setGoals((arr) => arr.filter((x) => x.goal_id !== g.goal_id));
    try { await api.delete(`/goals/${g.goal_id}`); toast.success("Removed."); }
    catch (e) { toast.error(formatApiError(e)); load(); }
  };

  return (
    <div className="px-5 md:px-10 py-8 max-w-[1100px] mx-auto pb-28">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 fade-up">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">Goals</div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight">What you're really here to do.</h1>
          <p className="text-velari-textSoft mt-2 text-[15px] max-w-xl">
            Name three to five. Velari will quietly notice when your time drifts away from them.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          data-testid="goal-new-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-velari-ink text-velari-cream hover:-translate-y-0.5 transition-transform ease-velari"
        >
          <Plus size={15} /> New goal
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={create}
          className="card-soft elevated p-6 mb-6 fade-up"
          data-testid="goal-form"
        >
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="A goal that matters to you…"
            data-testid="goal-title"
            className="w-full bg-transparent text-[22px] font-display tracking-tight focus:outline-none placeholder:text-velari-textSoft"
          />
          <textarea
            value={draft.why}
            onChange={(e) => setDraft({ ...draft, why: e.target.value })}
            placeholder="Why does this matter?"
            rows={2}
            data-testid="goal-why"
            className="mt-2 w-full bg-transparent text-[14px] focus:outline-none placeholder:text-velari-textSoft resize-none"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setDraft({ ...draft, color: c })}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${draft.color === c ? "scale-110 border-velari-text" : "border-transparent"}`}
                  style={{ background: c }}
                  data-testid={`goal-color-${c}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-velari-border bg-velari-bg text-[12.5px]">
              <span className="text-velari-textSoft">Weight</span>
              <input
                type="range"
                min={1}
                max={10}
                value={draft.weight}
                onChange={(e) => setDraft({ ...draft, weight: parseInt(e.target.value) })}
                className="accent-velari-brand w-24"
                data-testid="goal-weight"
              />
              <span className="font-display w-6 text-right">{draft.weight}</span>
            </div>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 rounded-full text-[13px] text-velari-textSoft hover:text-velari-text">Cancel</button>
              <button type="submit" data-testid="goal-save" className="px-4 py-2 rounded-full text-[13px] bg-velari-ink text-velari-cream">Save</button>
            </div>
          </div>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="card-soft elevated p-10 text-center fade-up">
          <Compass size={24} className="mx-auto text-velari-brand mb-3" />
          <div className="font-editorial italic text-2xl mb-2">A blank page.</div>
          <p className="text-velari-textSoft text-[14px] max-w-md mx-auto mb-5">
            Three goals are plenty. Tag your tasks to them, and the Insights page will quietly track whether your time matches your words.
          </p>
          <button onClick={() => setShowForm(true)} data-testid="goal-empty-cta" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-velari-ink text-velari-cream text-[14px]">
            Name your first goal <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 fade-up">
          {goals.map((g) => {
            const intended = totalWeight ? Math.round((g.weight / totalWeight) * 100) : 0;
            return (
              <div key={g.goal_id} className="card-soft p-6 group" data-testid={`goal-${g.goal_id}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: g.color }} />
                    <div className="font-display text-[19px] tracking-tight truncate">{g.title}</div>
                  </div>
                  <button onClick={() => remove(g)} data-testid={`goal-delete-${g.goal_id}`} className="opacity-0 group-hover:opacity-100 text-velari-textSoft hover:text-red-600 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
                {g.why && <p className="font-editorial italic text-[14px] text-velari-textSoft leading-snug mb-4">"{g.why}"</p>}
                <div className="flex items-center gap-2 text-[11.5px] mb-3">
                  <span className="text-velari-textSoft">Intended share</span>
                  <span className="font-display text-velari-text">{intended}%</span>
                  <span className="text-velari-textSoft">·</span>
                  <span className="text-velari-textSoft">Weight</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={g.weight}
                    onChange={(e) => updateWeight(g, parseInt(e.target.value))}
                    className="accent-velari-brand flex-1"
                    data-testid={`goal-weight-${g.goal_id}`}
                  />
                  <span className="font-display w-5 text-right">{g.weight}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <div className="flex-1 h-1.5 rounded-full bg-velari-surfaceAlt overflow-hidden">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${g.progress_pct}%`, background: g.color }} />
                  </div>
                  <span className="text-velari-textSoft w-24 text-right">{g.tasks_done_14d}/{g.tasks_total_14d} · {g.progress_pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {goals.length > 0 && (
        <div className="mt-6 text-center">
          <Link to="/insights" className="text-[13px] text-velari-textSoft hover:text-velari-text inline-flex items-center gap-1.5">
            See goal alignment in Insights <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
