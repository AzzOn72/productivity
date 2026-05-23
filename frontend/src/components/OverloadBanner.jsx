import { AlertTriangle, ArrowRight } from "lucide-react";

export default function OverloadBanner({ data, onShift }) {
  if (!data || !data.overloaded) return null;
  const overBy = Math.round((data.ratio - 1) * 100);
  return (
    <div
      data-testid="overload-banner"
      className="rounded-2xl border border-velari-brand/30 bg-velari-brand/8 px-4 py-3 flex items-center gap-3"
    >
      <div className="h-9 w-9 rounded-full bg-velari-brand/15 text-velari-brand flex items-center justify-center shrink-0">
        <AlertTriangle size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-[14px] tracking-tight">
          You're planning {overBy}% over capacity.
        </div>
        <div className="text-[12.5px] text-velari-textSoft">
          {Math.floor(data.estimated_minutes / 60)}h {data.estimated_minutes % 60}m of intent, {Math.floor(data.capacity_minutes / 60)}h budget.
        </div>
      </div>
      {onShift && (
        <button
          onClick={onShift}
          data-testid="overload-shift"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-velari-ink text-velari-cream text-[12px] hover:-translate-y-0.5 transition-transform ease-velari"
        >
          Move to tomorrow <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}
