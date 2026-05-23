import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Heart, Check } from "lucide-react";

const MOOD = [
  { v: 1, label: "Heavy", glyph: "·" },
  { v: 2, label: "Slow", glyph: "··" },
  { v: 3, label: "Steady", glyph: "···" },
  { v: 4, label: "Bright", glyph: "····" },
  { v: 5, label: "Vivid", glyph: "·····" },
];

/**
 * Tiny daily mood + energy check-in.
 * Compact, calm, and live on the Today dashboard.
 */
export default function MoodCheckIn({ open: forceOpen, onClose, onSaved }) {
  const [existing, setExisting] = useState(null);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/checkin/today");
        if (data && data.mood) {
          setExisting(data);
          setMood(data.mood);
          setEnergy(data.energy || 3);
        }
      } catch {}
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/checkin", { mood, energy });
      setExisting(data);
      toast.success("Noted. Velari will adapt.");
      onSaved?.(data);
      if (forceOpen) onClose?.();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-soft p-5" data-testid="mood-checkin">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">How are you?</div>
        {existing && (
          <span className="text-[10.5px] inline-flex items-center gap-1 text-velari-sage">
            <Check size={10} /> Checked in
          </span>
        )}
      </div>

      <div className="space-y-3.5">
        <Row label="Mood" value={mood} onChange={setMood} testid="mood" />
        <Row label="Energy" value={energy} onChange={setEnergy} testid="energy" />
      </div>

      <button
        onClick={save}
        disabled={busy}
        data-testid="mood-save"
        className="mt-4 w-full h-10 rounded-xl bg-velari-ink text-velari-cream text-[13px] flex items-center justify-center gap-1.5 hover:-translate-y-0.5 transition-transform ease-velari disabled:opacity-50"
      >
        <Heart size={12} /> {existing ? "Update" : "Save check-in"}
      </button>
    </div>
  );
}

function Row({ label, value, onChange, testid }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-velari-textSoft">{label}</span>
        <span className="text-[11px] text-velari-textSoft">{MOOD[value - 1]?.label}</span>
      </div>
      <div className="flex gap-1.5">
        {MOOD.map((m) => (
          <button
            key={m.v}
            onClick={() => onChange(m.v)}
            data-testid={`${testid}-${m.v}`}
            className={`flex-1 h-9 rounded-lg border text-[12px] transition-all ${
              value === m.v
                ? "bg-velari-ink text-velari-cream border-velari-ink"
                : "bg-velari-bg border-velari-border text-velari-textSoft hover:text-velari-text"
            }`}
          >
            {m.glyph}
          </button>
        ))}
      </div>
    </div>
  );
}
