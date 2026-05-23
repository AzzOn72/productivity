import { Flame } from "lucide-react";

/**
 * Soft, non-toxic streak: small flame icon with current days.
 * No shame language. No big numbers.
 */
export default function StreakBadge({ current = 0, longest = 0, compact = false }) {
  if (current <= 0) return null;
  return (
    <div
      data-testid="streak-badge"
      title={`Longest: ${longest} day${longest === 1 ? "" : "s"}`}
      className={`inline-flex items-center gap-1.5 ${
        compact ? "px-2 py-1" : "px-2.5 py-1.5"
      } rounded-full bg-velari-brand/10 border border-velari-brand/20 text-velari-brand`}
    >
      <Flame size={compact ? 11 : 12} className="opacity-90" />
      <span className={`font-display tracking-tight ${compact ? "text-[11px]" : "text-[12px]"}`}>
        {current} day{current === 1 ? "" : "s"}
      </span>
    </div>
  );
}
