import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { ArrowRight, ArrowLeft, Check, Sun, Moon, CloudSun } from "lucide-react";
import { toast } from "sonner";

const GOALS = [
  { id: "build", label: "Build something meaningful", line: "Founders, makers, creators." },
  { id: "career", label: "Grow in my career", line: "Senior individual contributors." },
  { id: "study", label: "Study & deep learning", line: "Researchers, students, lifelong learners." },
  { id: "balance", label: "Live a more intentional life", line: "Calm, presence, less noise." },
];
const STYLES = [
  { id: "deep", label: "Long deep work blocks" },
  { id: "sprint", label: "Short focused sprints" },
  { id: "mixed", label: "A bit of both" },
];
const CHRONOS = [
  { id: "morning", label: "Mornings", icon: Sun, hint: "Best from 6am — 11am" },
  { id: "balanced", label: "Balanced", icon: CloudSun, hint: "Steady through the day" },
  { id: "night", label: "Nights", icon: Moon, hint: "Best from 7pm — 1am" },
];

const STEPS = 4;

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [workStyle, setWorkStyle] = useState("");
  const [chronotype, setChronotype] = useState("balanced");
  const [dailyCapacity, setDailyCapacity] = useState(4);
  const [intentions, setIntentions] = useState([]);
  const [busy, setBusy] = useState(false);

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canNext = () => {
    if (step === 0) return !!primaryGoal;
    if (step === 1) return !!workStyle;
    if (step === 2) return !!chronotype && dailyCapacity > 0;
    if (step === 3) return intentions.length > 0;
    return true;
  };

  const finish = async () => {
    setBusy(true);
    try {
      await api.post("/onboarding", {
        primary_goal: primaryGoal,
        work_style: workStyle,
        daily_capacity: dailyCapacity,
        chronotype,
        intentions,
      });
      await refresh();
      toast.success("Velari is yours.");
      nav("/today", { replace: true });
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleIntention = (s) => {
    setIntentions((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));
  };

  return (
    <div className="min-h-screen bg-velari-bg flex flex-col">
      <div className="px-6 lg:px-10 py-6 flex items-center justify-between">
        <Logo />
        <div className="text-[12px] text-velari-textSoft tracking-[0.15em] uppercase">
          Step {step + 1} of {STEPS}
        </div>
      </div>

      <div className="px-2">
        <div className="mx-auto max-w-3xl">
          <div className="h-[2px] bg-velari-border rounded-full overflow-hidden">
            <div
              className="h-full bg-velari-brand transition-all duration-700 ease-velari"
              style={{ width: `${((step + 1) / STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          {step === 0 && (
            <Step
              title={`Hello${user?.name ? `, ${user.name.split(" ")[0]}` : ""}.`}
              subtitle="What are you here to do?"
            >
              <div className="grid gap-3">
                {GOALS.map((g) => (
                  <Choice
                    key={g.id}
                    selected={primaryGoal === g.label}
                    onClick={() => setPrimaryGoal(g.label)}
                    testid={`goal-${g.id}`}
                    label={g.label}
                    hint={g.line}
                  />
                ))}
              </div>
            </Step>
          )}

          {step === 1 && (
            <Step title="How do you do your best work?" subtitle="We'll shape your day around it.">
              <div className="grid gap-3">
                {STYLES.map((s) => (
                  <Choice
                    key={s.id}
                    selected={workStyle === s.label}
                    onClick={() => setWorkStyle(s.label)}
                    testid={`style-${s.id}`}
                    label={s.label}
                  />
                ))}
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step title="When is your mind sharpest?" subtitle="Velari will protect those hours.">
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                {CHRONOS.map(({ id, label, icon: Icon, hint }) => (
                  <button
                    key={id}
                    onClick={() => setChronotype(id)}
                    data-testid={`chrono-${id}`}
                    className={`text-left p-5 rounded-2xl border transition-all ease-velari ${
                      chronotype === id
                        ? "bg-velari-surface border-velari-brand shadow-[0_8px_30px_-15px_rgba(200,107,82,0.4)]"
                        : "bg-velari-surface border-velari-border hover:border-velari-textSoft/40"
                    }`}
                  >
                    <Icon size={20} className="text-velari-brand mb-3" />
                    <div className="font-display text-lg">{label}</div>
                    <div className="text-[12.5px] text-velari-textSoft mt-1">{hint}</div>
                  </button>
                ))}
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-velari-textSoft mb-2">Daily focus capacity</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={dailyCapacity}
                    onChange={(e) => setDailyCapacity(parseInt(e.target.value))}
                    className="flex-1 accent-velari-brand"
                    data-testid="capacity-slider"
                  />
                  <div className="font-display text-2xl w-16 text-right">{dailyCapacity}h</div>
                </div>
                <p className="text-[12.5px] text-velari-textSoft mt-2">
                  Most people overestimate this. Four hours of true focus is a great day.
                </p>
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="What words feel like you?" subtitle="Pick two or three. Velari will speak in this tone.">
              <div className="flex flex-wrap gap-2">
                {["calm", "clear", "ambitious", "playful", "rigorous", "gentle", "bold", "patient", "creative", "intentional"].map((w) => (
                  <button
                    key={w}
                    onClick={() => toggleIntention(w)}
                    data-testid={`intent-${w}`}
                    className={`px-4 py-2 rounded-full border transition-all text-[14px] ${
                      intentions.includes(w)
                        ? "bg-velari-ink text-velari-cream border-velari-ink"
                        : "bg-velari-surface text-velari-text border-velari-border hover:border-velari-textSoft/40"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </Step>
          )}

          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 0}
              data-testid="onb-back"
              className="inline-flex items-center gap-2 text-[14px] text-velari-textSoft hover:text-velari-text disabled:opacity-30"
            >
              <ArrowLeft size={15} /> Back
            </button>
            <button
              onClick={step === STEPS - 1 ? finish : next}
              disabled={!canNext() || busy}
              data-testid="onb-next"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-velari-ink text-velari-cream text-[14.5px] disabled:opacity-40 hover:-translate-y-0.5 transition-transform ease-velari"
            >
              {step === STEPS - 1 ? (busy ? "Setting up…" : "Open Velari") : "Continue"}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }) {
  return (
    <div className="fade-up">
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-[1.05] mb-3">{title}</h1>
      <p className="text-velari-textSoft text-[16px] mb-9">{subtitle}</p>
      {children}
    </div>
  );
}

function Choice({ selected, onClick, label, hint, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`text-left rounded-2xl border p-5 transition-all ease-velari flex items-center justify-between gap-4 ${
        selected
          ? "bg-velari-surface border-velari-brand shadow-[0_8px_30px_-15px_rgba(200,107,82,0.35)]"
          : "bg-velari-surface border-velari-border hover:border-velari-textSoft/40"
      }`}
    >
      <div>
        <div className="font-display text-lg">{label}</div>
        {hint && <div className="text-[12.5px] text-velari-textSoft mt-1">{hint}</div>}
      </div>
      <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${selected ? "bg-velari-brand border-velari-brand" : "border-velari-border"}`}>
        {selected && <Check size={12} className="text-white" />}
      </div>
    </button>
  );
}
