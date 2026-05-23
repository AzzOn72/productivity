/**
 * Today clarity score — large iconic circular ring.
 * Lives at the top-left of Today as the emotional anchor.
 */
export default function ClarityScore({ done = 0, total = 0, focusMinutes = 0, capacityMinutes = 240 }) {
  const taskPct = total ? Math.round((done / total) * 100) : 0;
  const focusPct = capacityMinutes ? Math.round((focusMinutes / capacityMinutes) * 100) : 0;
  // Clarity blends task completion with focus accumulation
  const clarity = Math.round(0.65 * taskPct + 0.35 * Math.min(100, focusPct));
  const R = 50;
  const C = 2 * Math.PI * R;
  const dash = (clarity / 100) * C;

  return (
    <div className="flex items-center gap-5" data-testid="clarity-score">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
          <circle cx="60" cy="60" r={R} stroke="hsl(var(--velari-border))" strokeWidth="6" fill="none" />
          <circle
            cx="60"
            cy="60"
            r={R}
            stroke="url(#clarityGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${C}`}
            style={{ transition: "stroke-dasharray 1s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
          />
          <defs>
            <linearGradient id="clarityGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--velari-sage))" />
              <stop offset="100%" stopColor="hsl(var(--velari-brand))" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-3xl tracking-tight leading-none">{clarity}</div>
          <div className="text-[9.5px] uppercase tracking-[0.18em] text-velari-textSoft mt-1">clarity</div>
        </div>
      </div>
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mb-1.5">Today</div>
        <div className="font-display text-xl tracking-tight leading-tight">
          {done} of {total || "0"} done
        </div>
        <div className="text-[12.5px] text-velari-textSoft mt-0.5">
          {Math.floor(focusMinutes / 60)}h {focusMinutes % 60}m focused · {Math.floor(capacityMinutes / 60)}h capacity
        </div>
      </div>
    </div>
  );
}
