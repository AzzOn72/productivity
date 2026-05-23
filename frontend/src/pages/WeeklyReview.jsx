import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, Plus, X, ArrowRight, ArrowLeft, Check, TrendingUp, TrendingDown, Sun, AlertTriangle } from "lucide-react";

const STEPS = ["Wins", "Challenges", "Coaching", "Next week"];

function isoMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function fmtPct(p) {
  if (p == null) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p}%`;
}

export default function WeeklyReview() {
  const [summary, setSummary] = useState(null);
  const [compare, setCompare] = useState(null);
  const [insight, setInsight] = useState("");
  const [step, setStep] = useState(0);
  const [wins, setWins] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [intentions, setIntentions] = useState([]);
  const [energy, setEnergy] = useState(7);
  const [focus, setFocus] = useState(7);
  const [history, setHistory] = useState([]);
  const [draftWin, setDraftWin] = useState("");
  const [draftChallenge, setDraftChallenge] = useState("");
  const [draftIntent, setDraftIntent] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, h, c] = await Promise.all([
          api.get("/reviews/summary"),
          api.get("/reviews"),
          api.get("/insights/weekly-compare"),
        ]);
        setSummary(s.data);
        setHistory(h.data);
        setCompare(c.data);
      } catch (e) { toast.error(formatApiError(e)); }
    })();
  }, []);

  const getInsight = async () => {
    setInsightLoading(true);
    try {
      const { data } = await api.get("/ai/weekly-insight");
      setInsight(data.insight);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setInsightLoading(false); }
  };

  useEffect(() => {
    if (step === 2 && !insight) getInsight();
    // eslint-disable-next-line
  }, [step]);

  const save = async () => {
    try {
      await api.post("/reviews", {
        week_of: isoMonday(),
        wins, challenges,
        next_week_intentions: intentions,
        energy_rating: energy,
        focus_rating: focus,
      });
      toast.success("Week sealed. Onward.");
      setStep(0);
      setWins([]); setChallenges([]); setIntentions([]);
      const { data } = await api.get("/reviews");
      setHistory(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const tasksDelta = compare?.deltas_pct?.tasks_done;
  const focusDelta = compare?.deltas_pct?.focus_minutes;
  const bestDay = compare?.best_day
    ? new Date(compare.best_day._id + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" })
    : null;
  const distraction = compare?.distraction_rate_pct ?? 0;

  return (
    <div className="px-5 md:px-10 py-8 max-w-[1100px] mx-auto pb-28">
      <div className="mb-7 fade-up">
        <div className="text-[11px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">Weekly Review</div>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight">A small ceremony for this week.</h1>
        <p className="text-velari-textSoft mt-2 text-[15px] max-w-xl">Five minutes to turn seven days into momentum.</p>
      </div>

      {/* Coaching banner — comparisons */}
      {compare && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 fade-up">
          <CoachStat
            label="Tasks completed"
            value={compare.this_week.tasks_done}
            delta={tasksDelta}
            note={tasksDelta == null ? "First reference week." : tasksDelta >= 0 ? "Trending up. Keep the rhythm." : "Quieter week. That's allowed."}
          />
          <CoachStat
            label="Focus minutes"
            value={compare.this_week.focus_minutes}
            delta={focusDelta}
            note={focusDelta == null ? "Start tracking focus." : focusDelta >= 0 ? "Deeper work this week." : "Less depth — protect a block."}
          />
          {bestDay ? (
            <div className="card-soft elevated p-5">
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">Best productivity day</div>
              <div className="mt-1 font-display text-2xl tracking-tight flex items-center gap-2">
                <Sun size={18} className="text-velari-brand" />
                {bestDay}
              </div>
              <div className="text-[12.5px] text-velari-textSoft mt-1">Most things crossed off. Notice when.</div>
            </div>
          ) : (
            <div className="card-soft elevated p-5">
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">Best day</div>
              <div className="mt-1 font-editorial italic text-[15px] text-velari-textSoft">No completed tasks yet.</div>
            </div>
          )}

          {/* Distraction pattern */}
          <div className="md:col-span-3 card-soft p-5 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${distraction > 30 ? "bg-velari-brand/15 text-velari-brand" : "bg-velari-sage/15 text-velari-sage"}`}>
              <AlertTriangle size={16} />
            </div>
            <div className="flex-1">
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">Distraction pattern</div>
              <div className="font-display text-[16px] tracking-tight mt-0.5">
                {distraction}% of focus sessions were interrupted.
              </div>
            </div>
            <div className="text-[12.5px] text-velari-textSoft max-w-xs text-right">
              {distraction === 0 ? "Clean focus all week. Beautiful." : distraction <= 25 ? "Healthy — most sessions held." : distraction <= 50 ? "Try one undistracted 50-minute block." : "Protect mornings. Notifications off."}
            </div>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="card-soft elevated p-6 md:p-8 fade-up">
        <div className="flex items-center gap-3 mb-7">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-display ${i <= step ? "bg-velari-ink text-velari-cream" : "bg-velari-surfaceAlt text-velari-textSoft"}`}>
                {i < step ? <Check size={11} /> : i + 1}
              </div>
              <div className={`text-[12.5px] ${i === step ? "text-velari-text" : "text-velari-textSoft"}`}>{s}</div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-velari-ink" : "bg-velari-border"}`} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <Section title="What went well?" hint="Big or small. Don't be modest.">
            <ItemList items={wins} setItems={setWins} draft={draftWin} setDraft={setDraftWin} placeholder="A small or large win…" testidPrefix="win" />
          </Section>
        )}
        {step === 1 && (
          <Section title="Where did you struggle?" hint="No shame. Just notice the pattern.">
            <ItemList items={challenges} setItems={setChallenges} draft={draftChallenge} setDraft={setDraftChallenge} placeholder="A challenge or friction point…" testidPrefix="challenge" />
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <Slider label="Energy" value={energy} onChange={setEnergy} />
              <Slider label="Focus" value={focus} onChange={setFocus} />
            </div>
          </Section>
        )}
        {step === 2 && (
          <Section title="Velari's reflection" hint="Three short lines. Take what's useful.">
            <div className="rounded-2xl bg-gradient-to-br from-velari-brand/8 to-velari-sage/8 border border-velari-brand/20 p-5 leading-relaxed text-[14.5px] min-h-[140px] whitespace-pre-wrap">
              <div className="text-[10px] uppercase tracking-[0.22em] text-velari-brand mb-2 flex items-center gap-1.5">
                <Sparkles size={11} /> Coach
              </div>
              {insightLoading ? (
                <div className="text-velari-textSoft text-[14px] italic font-editorial">Reading your week…</div>
              ) : (
                insight || "—"
              )}
            </div>
          </Section>
        )}
        {step === 3 && (
          <Section title="What's the shape of next week?" hint="Two or three intentions are plenty.">
            <ItemList items={intentions} setItems={setIntentions} draft={draftIntent} setDraft={setDraftIntent} placeholder="One intention for next week…" testidPrefix="intent" />
          </Section>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            data-testid="review-back"
            className="inline-flex items-center gap-2 text-[14px] text-velari-textSoft hover:text-velari-text disabled:opacity-30"
          >
            <ArrowLeft size={15} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              data-testid="review-next"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-velari-ink text-velari-cream text-[14px] hover:-translate-y-0.5 transition-transform ease-velari"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={save}
              data-testid="review-save"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-velari-brand text-white text-[14px] hover:-translate-y-0.5 transition-transform ease-velari"
            >
              Seal the week <Check size={14} />
            </button>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-10 fade-up">
          <div className="text-[11px] uppercase tracking-[0.22em] text-velari-textSoft mb-3">Past reviews</div>
          <div className="grid md:grid-cols-2 gap-3">
            {history.slice(0, 4).map((r) => (
              <div key={r.review_id} className="card-soft p-5">
                <div className="text-[12px] text-velari-textSoft">Week of {r.week_of}</div>
                <div className="font-display text-lg tracking-tight mt-1">{r.wins?.length || 0} wins · {r.challenges?.length || 0} challenges</div>
                <div className="text-[12.5px] text-velari-textSoft mt-2">Energy {r.energy_rating}/10 · Focus {r.focus_rating}/10</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CoachStat({ label, value, delta, note }) {
  const up = delta != null && delta >= 0;
  return (
    <div className="card-soft elevated p-5">
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="font-display text-3xl tracking-tight">{value}</div>
        {delta != null && (
          <div className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${up ? "text-velari-sage" : "text-velari-brand"}`}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {fmtPct(delta)}
          </div>
        )}
      </div>
      <div className="text-[12.5px] text-velari-textSoft mt-1.5">{note}</div>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="fade-up">
      <h3 className="font-display text-2xl tracking-tight">{title}</h3>
      <p className="text-velari-textSoft text-[14px] mt-1 mb-5">{hint}</p>
      {children}
    </div>
  );
}

function ItemList({ items, setItems, draft, setDraft, placeholder, testidPrefix }) {
  const add = () => {
    if (!draft.trim()) return;
    setItems([...items, draft.trim()]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          data-testid={`${testidPrefix}-input`}
          className="flex-1 h-11 px-3.5 rounded-xl bg-velari-bg border border-velari-border focus:outline-none focus:ring-2 focus:ring-velari-brand/40 text-[14.5px]"
        />
        <button
          onClick={add}
          data-testid={`${testidPrefix}-add`}
          className="h-11 w-11 rounded-xl bg-velari-ink text-velari-cream flex items-center justify-center"
        >
          <Plus size={16} />
        </button>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-velari-bg border border-velari-border">
            <div className="h-1.5 w-1.5 rounded-full bg-velari-brand" />
            <div className="flex-1 text-[14px]">{it}</div>
            <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-velari-textSoft hover:text-red-600">
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Slider({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.18em] text-velari-textSoft mb-2">{label}</span>
      <div className="flex items-center gap-3">
        <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="flex-1 accent-velari-brand" />
        <div className="font-display text-2xl w-10 text-right">{value}</div>
      </div>
    </label>
  );
}
