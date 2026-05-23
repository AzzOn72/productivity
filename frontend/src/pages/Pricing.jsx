import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import MarketingNav from "@/components/MarketingNav";
import { Logo } from "@/components/Logo";
import { Check, X, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/api";
import { IS_DEV_MODE } from "@/lib/devMode";
import { toast } from "sonner";

const TIERS = [
  {
    id: "free",
    name: "Quiet",
    price: "$0",
    cadence: "forever",
    pitch: "Start a calmer habit. No card.",
    cta: "Begin free",
    highlight: false,
    bullets: [
      "Today dashboard with clarity score",
      "Up to 30 active tasks",
      "Basic calendar",
      "1 daily habit",
      "Focus mode (Spark · 25 min)",
      "Weekly review (manual)",
    ],
    excluded: ["AI auto-plan", "AI weekly coaching", "Deep & Flow focus modes"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$5",
    cadence: "per month",
    pitch: "For the people who open Velari every morning.",
    cta: "Start Pro",
    highlight: true,
    bullets: [
      "Everything in Quiet",
      "Unlimited tasks & projects",
      "AI auto-plan my day",
      "AI prioritization (Claude)",
      "Natural-language capture",
      "Energy-aware schedule",
      "Habit streaks & rituals",
      "Deep work & Flow modes",
      "Overload detection",
      "Calendar export",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: "$15",
    cadence: "per month",
    pitch: "The full daily operating system.",
    cta: "Go Elite",
    highlight: false,
    luxury: true,
    bullets: [
      "Everything in Pro",
      "Weekly AI coaching with comparisons",
      "Distraction pattern analysis",
      "Goal & quarter planning",
      "Premium themes (soon)",
      "Priority support",
      "Early access to features",
      "Life journal export",
    ],
  },
];

const COMPARE_ROWS = [
  ["Today dashboard", true, true, true],
  ["AI auto-plan", false, true, true],
  ["AI weekly coaching", false, false, true],
  ["Focus: Spark", true, true, true],
  ["Focus: Deep & Flow", false, true, true],
  ["Flow score & interrupt tracking", false, true, true],
  ["Habit streaks", "1 habit", "Unlimited", "Unlimited"],
  ["Distraction pattern analysis", false, false, true],
  ["Calendar export", false, true, true],
  ["Premium themes", false, false, true],
  ["Priority support", false, false, true],
];

export default function Pricing() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);

  const handleCTA = async (tier) => {
    if (!user) {
      navigate("/signup");
      return;
    }
    if (tier.id === "free") {
      navigate("/today");
      return;
    }
    setBusy(tier.id);
    try {
      if (IS_DEV_MODE) {
        // DEV ONLY: Instantly grant the requested plan via dev override.
        const { data } = await api.post("/billing/upgrade", { plan: tier.id, dev_mode: true });
        updateUser({ plan: data.user.plan });
        toast.success(`Welcome to Velari ${tier.name}.`);
        navigate("/today");
      } else {
        await api.post("/billing/create-checkout", { plan: tier.id, dev_mode: false });
        toast.message("Stripe checkout is not wired yet.");
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-velari-bg text-velari-text grain">
      <MarketingNav />

      <section className="px-4 md:px-8 pt-10 md:pt-16 pb-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-[11px] tracking-[0.22em] uppercase text-velari-brand mb-4">Pricing</div>
          <h1 className="font-display text-5xl sm:text-6xl tracking-tight leading-[1.02]">
            Three plans. <span className="font-editorial italic">No tricks.</span>
          </h1>
          <p className="text-velari-textSoft text-[16px] mt-5">
            Velari is honest software. Pick the version of your day you'd like to live.
          </p>
          {IS_DEV_MODE && (
            <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-velari-brand/10 border border-velari-brand/25 text-[11px] tracking-[0.16em] uppercase text-velari-brand">
              <Sparkles size={11} /> Dev preview · upgrades grant instantly
            </div>
          )}
        </div>
      </section>

      <section className="px-4 md:px-8 pb-20">
        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-5">
          {TIERS.map((t) => {
            const isCurrent = user?.plan === t.id;
            return (
              <article
                key={t.id}
                data-testid={`tier-${t.id}`}
                className={`relative rounded-3xl border p-7 flex flex-col transition-all ease-velari hover:-translate-y-1 ${
                  t.highlight
                    ? "bg-velari-surface border-velari-brand shadow-elevated"
                    : t.luxury
                    ? "bg-velari-ink text-velari-cream border-velari-ink shadow-elevated"
                    : "bg-velari-surface border-velari-border"
                }`}
              >
                {t.highlight && (
                  <div className="absolute -top-3 left-7 px-3 py-1 rounded-full bg-velari-brand text-white text-[10.5px] tracking-[0.22em] uppercase">
                    Most loved
                  </div>
                )}
                {t.luxury && (
                  <div className="absolute -top-3 left-7 px-3 py-1 rounded-full shimmer-border border bg-velari-ink text-velari-cream text-[10.5px] tracking-[0.22em] uppercase">
                    Elite
                  </div>
                )}
                <div className="text-[10.5px] uppercase tracking-[0.22em] opacity-70 mb-2">{t.name}</div>
                <div className="flex items-baseline gap-1.5 mb-1.5">
                  <div className="font-display text-5xl tracking-tight">{t.price}</div>
                  <div className="text-[13px] opacity-70">{t.cadence}</div>
                </div>
                <p className={`text-[14px] mb-6 ${t.luxury ? "opacity-80" : "text-velari-textSoft"}`}>{t.pitch}</p>

                <ul className="space-y-2.5 mb-7">
                  {t.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[14px]">
                      <Check size={15} className="mt-0.5 shrink-0 text-velari-brand" />
                      <span>{b}</span>
                    </li>
                  ))}
                  {t.excluded?.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[13.5px] opacity-50">
                      <X size={14} className="mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCTA(t)}
                  disabled={busy === t.id || isCurrent}
                  data-testid={`tier-cta-${t.id}`}
                  className={`mt-auto inline-flex items-center justify-center gap-2 h-11 rounded-full text-[14px] font-medium transition-transform ease-velari hover:-translate-y-0.5 disabled:opacity-60 ${
                    t.luxury
                      ? "bg-velari-cream text-velari-ink"
                      : t.highlight
                      ? "bg-velari-ink text-velari-cream"
                      : "border border-velari-border hover:bg-velari-surfaceAlt"
                  }`}
                >
                  {busy === t.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isCurrent ? (
                    <>Current plan <Check size={14} /></>
                  ) : (
                    <>{t.cta} <ArrowRight size={14} /></>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Compare */}
      <section className="px-4 md:px-8 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-[11px] tracking-[0.22em] uppercase text-velari-brand mb-3">Compare</div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-8">What you get, plan by plan.</h2>
          <div className="rounded-2xl border border-velari-border overflow-hidden bg-velari-surface">
            <div className="grid grid-cols-4 text-[13px]">
              <div className="p-4 border-b border-velari-border text-velari-textSoft uppercase tracking-[0.16em] text-[11px]">Feature</div>
              <div className="p-4 border-b border-velari-border font-display text-[15px]">Quiet</div>
              <div className="p-4 border-b border-velari-border font-display text-[15px] bg-velari-surfaceAlt">Pro</div>
              <div className="p-4 border-b border-velari-border font-display text-[15px]">Elite</div>
              {COMPARE_ROWS.map((row, i) => (
                <div key={i} className="contents">
                  <div className="p-4 border-t border-velari-border">{row[0]}</div>
                  <CompareCell v={row[1]} />
                  <CompareCell v={row[2]} highlight />
                  <CompareCell v={row[3]} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 md:px-8 pb-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl tracking-tight mb-8 text-center">Quiet questions</h2>
          <div className="space-y-3">
            {[
              ["Can I cancel anytime?", "Yes, instantly. Velari will keep your data for 90 days in case you come back."],
              ["Do you offer a student discount?", "We do. Write to us — half off Pro, no questions asked."],
              ["What AI do you use?", "Claude Sonnet 4.5 by Anthropic, chosen for warmth and clarity."],
              ["Is there a free trial of Pro?", "Yes — every new account gets 7 days of Pro, no card required."],
            ].map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-velari-border bg-velari-surface p-5">
                <summary className="font-display text-[16px] cursor-pointer list-none flex items-center justify-between">
                  {q} <span className="text-velari-textSoft text-2xl leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-[14px] text-velari-textSoft leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-4 md:px-8 py-10 border-t border-velari-border">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4 text-[13px] text-velari-textSoft">
          <Logo />
          <div>© 2026 Velari — Built quietly.</div>
        </div>
      </footer>
    </div>
  );
}

function CompareCell({ v, highlight }) {
  return (
    <div className={`p-4 border-t border-velari-border ${highlight ? "bg-velari-surfaceAlt" : ""}`}>
      {v === true ? (
        <Check size={15} className="text-velari-brand" />
      ) : v === false ? (
        <X size={15} className="text-velari-textSoft/50" />
      ) : (
        <span className="text-[13px]">{v}</span>
      )}
    </div>
  );
}
