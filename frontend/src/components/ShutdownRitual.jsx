import { useState } from "react";
import { Moon, X, Check, Plus } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ShutdownRitual({ open, onClose, onSaved }) {
  const [wins, setWins] = useState([]);
  const [draft, setDraft] = useState("");
  const [intention, setIntention] = useState("");
  const [energy, setEnergy] = useState(6);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const addWin = () => {
    if (!draft.trim()) return;
    setWins((w) => [...w, draft.trim()]);
    setDraft("");
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.post("/rituals/shutdown", {
        date: todayISO(),
        wins,
        tomorrows_intention: intention,
        energy,
      });
      toast.success("Day sealed. Rest well.");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="shutdown-ritual">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-velari-surface border border-velari-border p-7 fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-velari-textSoft hover:text-velari-text" data-testid="shutdown-close">
          <X size={18} />
        </button>
        <div className="flex items-center gap-2 mb-5">
          <div className="h-9 w-9 rounded-full bg-velari-sage/15 text-velari-sage flex items-center justify-center">
            <Moon size={16} />
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">Evening shutdown</div>
            <div className="font-display text-[18px] tracking-tight">Close the day with grace.</div>
          </div>
        </div>

        <div className="space-y-5">
          <Section label="What went well?">
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWin(); } }}
                placeholder="A small win, a kindness…"
                data-testid="shutdown-win-input"
                className="flex-1 h-10 px-3 rounded-xl bg-velari-bg border border-velari-border focus:outline-none focus:ring-2 focus:ring-velari-brand/40 text-[14px]"
              />
              <button onClick={addWin} className="h-10 w-10 rounded-xl bg-velari-ink text-velari-cream flex items-center justify-center" data-testid="shutdown-win-add">
                <Plus size={15} />
              </button>
            </div>
            {wins.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {wins.map((w, i) => (
                  <li key={i} className="text-[13.5px] flex items-center gap-2">
                    <Check size={12} className="text-velari-brand" />{w}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section label="Tomorrow's one intention">
            <input
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="If only one thing happens tomorrow…"
              data-testid="shutdown-intention"
              className="w-full h-10 px-3 rounded-xl bg-velari-bg border border-velari-border focus:outline-none focus:ring-2 focus:ring-velari-brand/40 text-[14px]"
            />
          </Section>

          <Section label="How does today feel?">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={energy}
                onChange={(e) => setEnergy(parseInt(e.target.value))}
                className="flex-1 accent-velari-brand"
                data-testid="shutdown-energy"
              />
              <div className="font-display text-xl w-8 text-right">{energy}</div>
            </div>
          </Section>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <button onClick={onClose} className="text-[13px] text-velari-textSoft hover:text-velari-text" data-testid="shutdown-skip">
            Skip tonight
          </button>
          <button
            onClick={save}
            disabled={busy}
            data-testid="shutdown-save"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-velari-ink text-velari-cream text-[13.5px] disabled:opacity-50 hover:-translate-y-0.5 transition-transform ease-velari"
          >
            {busy ? "Sealing…" : "Seal the day"} <Check size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">{label}</div>
      {children}
    </div>
  );
}
