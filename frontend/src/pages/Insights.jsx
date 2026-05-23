import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Flame as FlameIcon,
  Clock,
  Calendar,
  Activity,
  Target as TargetIcon,
  Compass,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton, SkeletonText } from "@/components/Skeleton";

export default function Insights() {
  const [patterns, setPatterns] = useState(null);
  const [burnout, setBurnout] = useState(null);
  const [personality, setPersonality] = useState(null);
  const [goalAlign, setGoalAlign] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, b, per, ga] = await Promise.all([
          api.get("/insights/patterns"),
          api.get("/insights/burnout"),
          api.get("/insights/personality"),
          api.get("/insights/goal-alignment"),
        ]);
        setPatterns(p.data);
        setBurnout(b.data);
        setPersonality(per.data);
        setGoalAlign(ga.data);
      } catch (e) { toast.error(formatApiError(e)); }
    })();
  }, []);

  return (
    <div className="px-5 md:px-10 py-8 max-w-[1200px] mx-auto pb-28">
      <div className="mb-8 fade-up">
        <div className="text-[11px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">Insights</div>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight">How you actually live.</h1>
        <p className="text-velari-textSoft mt-2 text-[15px] max-w-xl">
          Velari learns your rhythm. These are the patterns it has noticed — quietly, without judgment.
        </p>
      </div>

      {/* Personality + Burnout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6 fade-up">
        {/* Personality */}
        <div className="lg:col-span-2 card-soft elevated p-7 relative overflow-hidden">
          <div className="absolute -top-12 -right-10 h-44 w-44 rounded-full bg-velari-sage/15 blur-3xl pointer-events-none" />
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-brand mb-2 flex items-center gap-1.5">
            <Sparkles size={11} /> Productivity personality
          </div>
          {personality ? (
            <div className="relative" data-testid="personality">
              <div className="font-display text-4xl sm:text-5xl tracking-tight leading-[1.05] mb-3">
                {personality.archetype}
              </div>
              <p className="font-editorial italic text-[18px] text-velari-textSoft leading-snug max-w-md mb-5">
                {personality.headline}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Mini label="Avg session" value={`${personality.signals.average_session_min}m`} />
                <Mini label="Long sessions / mo" value={personality.signals.long_sessions_30d} />
                <Mini label="Tasks done / mo" value={personality.signals.completed_tasks_30d} />
                <Mini label="Journal entries" value={personality.signals.journal_entries_30d} />
                <Mini label="Active goals" value={personality.signals.active_goals} />
                <Mini label="Reviews / mo" value={personality.signals.reviews_30d} />
              </div>
            </div>
          ) : (
            <div className="space-y-4" data-testid="personality-loading">
              <Skeleton className="h-10 w-48" />
              <SkeletonText lines={2} />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-12 rounded-lg" />
              </div>
            </div>
          )}
        </div>

        {/* Burnout */}
        <div className="card-soft elevated p-6" data-testid="burnout">
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mb-2 flex items-center gap-1.5">
            <AlertTriangle size={11} /> Burnout signal
          </div>
          {burnout ? (
            <>
              <div className="font-display text-5xl tracking-tight">
                {burnout.score}
                <span className="text-[14px] text-velari-textSoft ml-1.5 font-display">/100</span>
              </div>
              <div
                className={`mt-1 text-[13px] inline-block px-2.5 py-0.5 rounded-full capitalize ${
                  burnout.level === "calm"
                    ? "bg-velari-sage/15 text-velari-sage"
                    : burnout.level === "stretched"
                    ? "bg-velari-brand/15 text-velari-brand"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {burnout.level}
              </div>
              <p className="font-editorial italic text-[15px] text-velari-text mt-3 leading-snug">{burnout.message}</p>
              <div className="mt-4 space-y-1.5">
                <Bar label="Overload" v={burnout.components.overload} max={60} />
                <Bar label="Interruptions" v={burnout.components.interruptions} max={25} />
                <Bar label="Completion drop" v={burnout.components.completion_drop} max={15} />
                <Bar label="Late-night" v={burnout.components.late_night} max={10} />
              </div>
            </>
          ) : (
            <div className="text-velari-textSoft italic font-editorial">Reading your week…</div>
          )}
        </div>
      </div>

      {/* Patterns */}
      <div className="card-soft elevated p-6 sm:p-7 mb-6 fade-up">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mb-5">Your patterns</div>
        {patterns ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <Pattern icon={Calendar} label="Best day of week" value={patterns.best_day_of_week || "—"} />
            <Pattern icon={Clock} label="Best hour band" value={patterns.best_hour_band || "—"} />
            <Pattern icon={Activity} label="Avg focus session" value={`${patterns.average_focus_session_minutes}m`} />
            <Pattern icon={FlameIcon} label="Tasks / active day" value={patterns.average_tasks_per_active_day} />
            <Pattern icon={TargetIcon} label="Interrupt rate" value={`${patterns.interrupt_rate_pct}%`} subtle={patterns.interrupt_rate_pct < 30 ? "Healthy focus" : "Worth protecting"} />
            <Pattern icon={Activity} label="Habit consistency" value={`${patterns.habit_consistency_pct}%`} />
            <Pattern icon={FlameIcon} label="Sessions / mo" value={patterns.focus_sessions_30d} />
            <Pattern icon={Calendar} label="Completed / mo" value={patterns.completed_30d} />
          </div>
        ) : (
          <div className="text-velari-textSoft italic font-editorial">Calculating…</div>
        )}

        {patterns?.completion_by_priority && (
          <div className="mt-7">
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mb-3">Completion by priority</div>
            <div className="space-y-2.5">
              {["urgent", "high", "medium", "low"].map((p) => {
                const row = patterns.completion_by_priority[p] || { rate_pct: 0, done: 0, total: 0 };
                return (
                  <div key={p} className="grid grid-cols-[80px_1fr_70px] items-center gap-3">
                    <div className="text-[12.5px] capitalize text-velari-textSoft">{p}</div>
                    <div className="h-2 rounded-full bg-velari-surfaceAlt overflow-hidden">
                      <div className="h-full rounded-full bg-velari-brand transition-[width] duration-700" style={{ width: `${row.rate_pct}%` }} />
                    </div>
                    <div className="text-[12px] text-velari-textSoft text-right">{row.done}/{row.total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Goal alignment */}
      <div className="card-soft elevated p-6 sm:p-7 fade-up" data-testid="goal-alignment">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">Goal alignment</div>
            <h3 className="font-display text-2xl tracking-tight">Where your time actually goes.</h3>
          </div>
          <Link to="/goals" className="text-[12.5px] text-velari-textSoft hover:text-velari-text inline-flex items-center gap-1">
            Edit goals <ChevronRight size={13} />
          </Link>
        </div>

        {goalAlign && goalAlign.goals?.length > 0 ? (
          <>
            <div className="space-y-3">
              {goalAlign.goals.map((g) => (
                <div key={g.goal_id} className="grid grid-cols-[150px_1fr_120px] items-center gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: g.color || "#C86B52" }} />
                    <span className="text-[13.5px] truncate font-display">{g.title}</span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-velari-surfaceAlt overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700" style={{ width: `${g.actual_pct}%`, background: g.color || "#C86B52" }} />
                    <div className="absolute top-0 bottom-0" style={{ left: `${g.intended_pct}%`, borderLeft: "2px dashed hsl(var(--velari-text-soft))" }} />
                  </div>
                  <div className="text-[12px] text-velari-textSoft text-right">
                    {g.actual_pct}% <span className="opacity-60">/ {g.intended_pct}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11.5px] text-velari-textSoft mt-3">
              Solid bar = actual time · dashed line = intended weight
            </div>
            {goalAlign.drift?.length > 0 && (
              <div className="mt-5 rounded-2xl border border-velari-brand/25 bg-velari-brand/8 px-4 py-3.5">
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-brand mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={11} /> Goal drift
                </div>
                <ul className="space-y-1.5 text-[13px]">
                  {goalAlign.drift.map((d) => (
                    <li key={d.goal_id} className="flex gap-2">
                      <span className="text-velari-brand font-display">{d.title}</span>
                      <span className="text-velari-textSoft">— {d.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <Compass size={20} className="mx-auto text-velari-brand mb-2" />
            <div className="font-editorial italic text-velari-textSoft mb-3">No goals named yet.</div>
            <Link to="/goals" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-velari-ink text-velari-cream text-[13px] hover:-translate-y-0.5 transition-transform ease-velari">
              Name your goals <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-velari-textSoft">{label}</div>
      <div className="font-display text-xl tracking-tight">{value}</div>
    </div>
  );
}

function Pattern({ icon: Icon, label, value, subtle }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] text-velari-textSoft">
        <Icon size={11} /> {label}
      </div>
      <div className="font-display text-[26px] tracking-tight leading-tight mt-1">{value}</div>
      {subtle && <div className="text-[11.5px] text-velari-textSoft">{subtle}</div>}
    </div>
  );
}

function Bar({ label, v, max }) {
  const pct = max ? Math.min(100, (v / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[110px_1fr_30px] items-center gap-2 text-[11.5px]">
      <div className="text-velari-textSoft">{label}</div>
      <div className="h-1.5 rounded-full bg-velari-surfaceAlt overflow-hidden">
        <div className="h-full rounded-full bg-velari-brand/80 transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-right text-velari-textSoft">{v}</div>
    </div>
  );
}
