/**
 * Momentum bar — a single fluid 0–100 indicator with calm label.
 * Used on Today as the "north star" feeling.
 */
export default function MomentumBar({ score = 0, label = "Quiet", components }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div data-testid="momentum-bar" className="w-full">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">Momentum</div>
          <div className="font-display text-2xl tracking-tight mt-0.5 flex items-baseline gap-2">
            {score}
            <span className="font-editorial italic text-[15px] text-velari-textSoft">{label.toLowerCase()}</span>
          </div>
        </div>
        {components && (
          <div className="hidden sm:flex gap-3 text-[10.5px] text-velari-textSoft">
            <Mini label="Tasks" v={components.tasks} />
            <Mini label="Focus" v={components.focus} />
            <Mini label="Habits" v={components.habits} />
          </div>
        )}
      </div>
      <div className="relative h-2 rounded-full bg-velari-surfaceAlt overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-velari"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, hsl(var(--velari-sage)) 0%, hsl(var(--velari-brand)) 100%)",
          }}
        />
      </div>
    </div>
  );
}

function Mini({ label, v }) {
  return (
    <div className="flex flex-col items-end">
      <span className="uppercase tracking-[0.18em] opacity-70">{label}</span>
      <span className="font-display text-velari-text text-[13px]">{Math.round(v || 0)}</span>
    </div>
  );
}
