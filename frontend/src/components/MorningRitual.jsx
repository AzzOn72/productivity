import { useState } from "react";
import { Sun, ArrowRight, X, Sparkles } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

/**
 * Morning ritual — 2-click flow:
 * 1) Confirm/edit today's intention.
 * 2) Auto-plan the day.
 */
export default function MorningRitual({ open, onClose, onPlanned, defaultIntention = "" }) {
  const [step, setStep] = useState(0);
  const [intention, setIntention] = useState(defaultIntention);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const next = async () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/ai/auto-plan");
      toast.success(`Day planned — ${data.created} block${data.created === 1 ? "" : "s"}.`);
      onPlanned?.(data);
      onClose();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="morning-ritual">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-velari-surface border border-velari-border p-7 fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-velari-textSoft hover:text-velari-text"
          data-testid="morning-close"
        >
          <X size={18} />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-full bg-velari-brand/15 text-velari-brand flex items-center justify-center">
            <Sun size={16} />
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-velari-textSoft">Morning ritual</div>
            <div className="font-display text-[18px] tracking-tight">Two breaths. Two clicks.</div>
          </div>
        </div>

        {step === 0 ? (
          <div className="fade-up">
            <p className="font-editorial italic text-velari-textSoft text-[15px] leading-snug mb-4">
              What is the one thing that, if done today, would make the day a quiet success?
            </p>
            <textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              rows={3}
              placeholder="Type one intention…"
              data-testid="morning-intention"
              className="w-full bg-velari-bg border border-velari-border rounded-xl p-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-velari-brand/40 resize-none"
            />
          </div>
        ) : (
          <div className="fade-up">
            <p className="font-editorial italic text-velari-text text-[16px] leading-snug mb-3">"{intention || "Move one important thing forward."}"</p>
            <p className="text-[13.5px] text-velari-textSoft leading-relaxed">
              Velari will arrange your tasks into focus blocks across the day, starting with what your chronotype handles best.
            </p>
          </div>
        )}

        <div className="mt-7 flex items-center justify-between">
          <button onClick={onClose} className="text-[13px] text-velari-textSoft hover:text-velari-text" data-testid="morning-skip">
            Skip for today
          </button>
          <button
            onClick={next}
            disabled={busy || (step === 0 && !intention.trim())}
            data-testid="morning-next"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-velari-ink text-velari-cream text-[13.5px] disabled:opacity-40 hover:-translate-y-0.5 transition-transform ease-velari"
          >
            {step === 0 ? "Continue" : busy ? "Planning…" : "Plan my day"}
            {step === 0 ? <ArrowRight size={13} /> : <Sparkles size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}
