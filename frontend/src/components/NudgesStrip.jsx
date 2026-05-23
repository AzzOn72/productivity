import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Bell, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const ROUTE = {
  checkin: null,
  capture: null,
  shutdown: null,
  streak: null,
  goal: "/goals",
};

export default function NudgesStrip({ onCheckin, onShutdown, onCapture }) {
  const [nudges, setNudges] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/nudges");
        setNudges(data);
      } catch {}
    })();
  }, []);

  if (!nudges.length) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="nudges-strip">
      {nudges.map((n) => {
        const route = ROUTE[n.kind];
        const inner = (
          <>
            <Bell size={11} className="text-velari-brand opacity-80" />
            <span className="text-[12.5px] text-velari-text">{n.text}</span>
            <span className="text-[11px] text-velari-textSoft inline-flex items-center gap-0.5 ml-1">
              {n.action} <ArrowRight size={10} />
            </span>
          </>
        );
        const className =
          "inline-flex items-center gap-2 px-3 py-2 rounded-full bg-velari-surface border border-velari-border hover:bg-velari-surfaceAlt transition-colors";

        if (route) {
          return (
            <Link key={n.id} to={route} data-testid={`nudge-${n.id}`} className={className}>{inner}</Link>
          );
        }
        const handler =
          n.kind === "checkin" ? onCheckin : n.kind === "shutdown" ? onShutdown : n.kind === "capture" || n.kind === "streak" ? onCapture : undefined;
        return (
          <button key={n.id} onClick={handler} data-testid={`nudge-${n.id}`} className={className}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
