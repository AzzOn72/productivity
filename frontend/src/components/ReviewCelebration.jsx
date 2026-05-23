import { useEffect, useState } from "react";
import { Sparkles, Check, ArrowRight, Sun } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Weekly Review completion celebration — calm rise + spark + summary.
 */
export default function ReviewCelebration({ open, onClose, summary, compare }) {
  const [phase, setPhase] = useState("rise"); // rise -> hold
  useEffect(() => {
    if (!open) return;
    setPhase("rise");
    const t = setTimeout(() => setPhase("hold"), 800);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;
  const tasks = summary?.tasks_done ?? compare?.this_week?.tasks_done ?? 0;
  const focus = Math.round((summary?.focus_minutes ?? compare?.this_week?.focus_minutes ?? 0) / 60);
  const habits = summary?.habit_checks ?? compare?.this_week?.habits ?? 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" data-testid="review-celebration">
      <div className="absolute inset-0 bg-velari-bg/95 backdrop-blur-md" onClick={onClose} />

      {/* Soft sparks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="spark absolute h-1.5 w-1.5 rounded-full bg-velari-brand"
            style={{
              left: `${15 + i * 6}%`,
              top: "60%",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-lg text-center rise">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-velari-brand/15 text-velari-brand mb-6">
          <Check size={26} />
        </div>
        <div className="text-[10.5px] uppercase tracking-[0.28em] text-velari-brand mb-3">Week sealed</div>
        <h2 className="font-display text-4xl sm:text-5xl tracking-tight leading-[1.05] mb-3">
          A week, well lived.
        </h2>
        <p className="font-editorial italic text-velari-textSoft text-[17px] leading-snug max-w-md mx-auto mb-7">
          You showed up. The smallest noticing is the most valuable thing a person can do.
        </p>

        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-8">
          <Stat label="Done" value={tasks} />
          <Stat label="Focus h" value={focus} />
          <Stat label="Habits" value={habits} />
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={onClose}
            data-testid="review-celebration-close"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-velari-ink text-velari-cream text-[14px] hover:-translate-y-0.5 transition-transform ease-velari"
          >
            <Sun size={14} /> Back to today
          </button>
          <Link
            to="/insights"
            onClick={onClose}
            data-testid="review-celebration-insights"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-velari-border bg-velari-surface text-[14px] hover:bg-velari-surfaceAlt"
          >
            <Sparkles size={14} /> See the trend
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card-soft elevated p-4">
      <div className="font-display text-3xl tracking-tight">{value}</div>
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mt-0.5">{label}</div>
    </div>
  );
}
