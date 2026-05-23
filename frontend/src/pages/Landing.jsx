import { Link } from "react-router-dom";
import MarketingNav from "@/components/MarketingNav";
import { Logo } from "@/components/Logo";
import {
  ArrowRight,
  Sparkles,
  Target,
  CalendarDays,
  Sun,
  Quote,
  Check,
  X,
  CircleDot,
  Leaf,
  Compass,
} from "lucide-react";

const HERO_IMG = "https://static.prod-images.emergentagent.com/jobs/4fd5d062-09fa-42b2-abd4-e7e2bb7da3f2/images/fd4eeb9fb662443e72d0818d21f250e6f4ae8a1a191053e6dcc626ebce28d2c3.png";
const BRAND_ART = "https://static.prod-images.emergentagent.com/jobs/4fd5d062-09fa-42b2-abd4-e7e2bb7da3f2/images/7f3333c84b4963fc70fbdfb833556fe1395541baba5e58a71198014ccfa06889.png";
const FOCUS_BG = "https://static.prod-images.emergentagent.com/jobs/4fd5d062-09fa-42b2-abd4-e7e2bb7da3f2/images/ca79768da3bd447b2e838c9292c4444638042c53d8ef34ee9d375d2df15ccf74.png";

const AVATARS = [
  "https://images.unsplash.com/photo-1767175620484-1ed37931a0d1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMG5ldXRyYWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3OTU1NDEwMXww&ixlib=rb-4.1.0&q=85&w=200",
  "https://images.unsplash.com/photo-1758613654360-45f1ff78c0cf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMG5ldXRyYWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3OTU1NDEwMXww&ixlib=rb-4.1.0&q=85&w=200",
  "https://images.unsplash.com/photo-1770058443069-e384cd001e9b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMG5ldXRyYWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3OTU1NDEwMXww&ixlib=rb-4.1.0&q=85&w=200",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-velari-bg text-velari-text grain">
      <MarketingNav />

      {/* HERO */}
      <section className="relative px-4 md:px-8 pt-10 md:pt-16 pb-20">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-7 fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-velari-border bg-velari-surface text-[12px] text-velari-textSoft mb-7">
              <span className="h-1.5 w-1.5 rounded-full bg-velari-brand" />
              <span className="tracking-[0.14em] uppercase font-medium">Now in private beta</span>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-[88px] leading-[0.95] tracking-[-0.035em] font-medium">
              The quiet
              <br />
              operating system
              <br />
              for{" "}
              <span className="font-editorial italic text-velari-brand">a life of focus.</span>
            </h1>

            <p className="mt-8 max-w-xl text-[17px] leading-[1.65] text-velari-textSoft">
              Velari unifies your day — tasks, calendar, focus, habits and reflection — into one
              calm, intelligent surface. It feels less like productivity software, and more like
              waking up clear-headed.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                data-testid="hero-start-btn"
                className="group inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-velari-ink text-velari-cream text-[15px] font-medium hover:-translate-y-0.5 transition-all ease-velari shadow-[0_18px_40px_-15px_rgba(0,0,0,0.35)]"
              >
                Begin your morning
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/pricing"
                data-testid="hero-pricing-btn"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full border border-velari-border bg-velari-surface text-[15px] hover:bg-velari-surfaceAlt transition-colors"
              >
                See pricing
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                {AVATARS.map((a, i) => (
                  <img key={i} src={a} className="h-8 w-8 rounded-full border-2 border-velari-bg object-cover" alt="" />
                ))}
              </div>
              <div className="text-[13px] text-velari-textSoft">
                <span className="text-velari-text font-medium">2,418 founders, designers and quiet thinkers</span> already in beta
              </div>
            </div>
          </div>

          {/* Bento mockup grid */}
          <div className="lg:col-span-5 relative">
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-6 rounded-3xl overflow-hidden border border-velari-border bg-velari-surface aspect-[5/3] relative">
                <img src={HERO_IMG} alt="workspace" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-velari-bg/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full glass">
                    <CircleDot size={12} className="text-velari-brand" />
                    <span className="text-[11px] tracking-wide">Today · 3 priorities</span>
                  </div>
                  <span className="text-[11px] px-2.5 py-1.5 rounded-full glass">9:41 AM</span>
                </div>
              </div>

              <div className="col-span-3 rounded-3xl border border-velari-border bg-velari-surface p-4 flex flex-col gap-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-velari-textSoft">Focus</div>
                <div className="font-display text-3xl tracking-tight">1h 42m</div>
                <div className="text-[11px] text-velari-sage">Above your weekly rhythm</div>
                <div className="mt-auto flex items-end gap-1 h-10">
                  {[14, 22, 18, 36, 28, 40, 34].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-velari-brand/30" style={{ height: `${h * 0.9}px` }} />
                  ))}
                </div>
              </div>

              <div className="col-span-3 rounded-3xl border border-velari-border bg-velari-ink text-velari-cream p-4 flex flex-col gap-2 relative overflow-hidden">
                <img src={BRAND_ART} className="absolute -right-6 -bottom-6 w-32 opacity-50" alt="" />
                <Sparkles size={16} className="opacity-70" />
                <div className="text-[12.5px] leading-snug relative">
                  "Start with what you've been avoiding. It is heavier than the rest of the day combined."
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-60 mt-auto">Velari Coach</div>
              </div>

              <div className="col-span-6 rounded-3xl border border-velari-border bg-velari-surface p-4">
                {[
                  { t: "Send first draft to Anya", d: "32m", done: true },
                  { t: "Deep work — design system v2", d: "1h 30m", done: false },
                  { t: "Walk before lunch", d: "20m", done: false },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-velari-border last:border-0">
                    <div className={`h-4 w-4 rounded-full border ${row.done ? "bg-velari-brand border-velari-brand" : "border-velari-border"}`}>
                      {row.done && <Check size={11} className="text-white m-0.5" />}
                    </div>
                    <div className={`text-[13.5px] flex-1 ${row.done ? "line-through text-velari-textSoft" : ""}`}>{row.t}</div>
                    <div className="text-[11px] text-velari-textSoft">{row.d}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* floating brand art */}
            <img src={BRAND_ART} alt="" className="absolute -top-12 -right-8 w-32 opacity-40 hidden lg:block breathe pointer-events-none" />
          </div>
        </div>
      </section>

      {/* PHILOSOPHY STRIP */}
      <section id="philosophy" className="px-4 md:px-8 py-20 border-t border-velari-border">
        <div className="mx-auto max-w-5xl text-center">
          <div className="text-[11px] tracking-[0.22em] uppercase text-velari-brand mb-6">The Philosophy</div>
          <p className="font-editorial italic text-3xl sm:text-4xl lg:text-5xl leading-[1.15] tracking-[-0.01em]">
            Productivity should not feel like a fight with yourself.
            <br />
            It should feel like a quiet morning, well used.
          </p>
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section id="features" className="px-4 md:px-8 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <div className="text-[11px] tracking-[0.22em] uppercase text-velari-brand mb-3">One Surface</div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight max-w-2xl">
                Six tools, woven into one calm rhythm.
              </h2>
            </div>
            <p className="max-w-sm text-velari-textSoft text-[15px]">
              Velari replaces five apps you check anxiously with a single one you open intentionally.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <FeatureCard
              className="md:col-span-7 md:row-span-2"
              icon={Sun}
              title="A Today that breathes"
              text="Three priorities, your energy state, your schedule and a coach who knows when you're spread thin."
              accent
            />
            <FeatureCard className="md:col-span-5" icon={Sparkles} title="An AI that doesn't yell" text="Claude-powered planning, natural-language capture, and reflections you'll actually read." />
            <FeatureCard className="md:col-span-5" icon={Target} title="Focus that feels cinematic" text="A fullscreen world for one task at a time. No tabs. No noise." />
            <FeatureCard className="md:col-span-4" icon={CalendarDays} title="Calendar, time-blocked" text="Drag your day into shape. Focus blocks live next to meetings, not under them." />
            <FeatureCard className="md:col-span-4" icon={Leaf} title="Habits, gently" text="Streaks without shame. Skip a day — the world doesn't end." />
            <FeatureCard className="md:col-span-4" icon={Compass} title="Weekly review" text="A Friday-evening ritual that turns weeks into momentum." />
          </div>
        </div>
      </section>

      {/* FOCUS MODE PREVIEW */}
      <section className="px-4 md:px-8 py-20">
        <div className="mx-auto max-w-6xl rounded-[28px] overflow-hidden border border-velari-border relative">
          <img src={FOCUS_BG} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/25 to-black/55" />
          <div className="relative p-10 md:p-20 text-velari-cream">
            <div className="text-[11px] tracking-[0.22em] uppercase opacity-80 mb-4">Focus Mode</div>
            <h3 className="font-display text-4xl md:text-6xl tracking-tight max-w-2xl leading-[1.05]">
              One task. One timer. One slow breath.
            </h3>
            <p className="mt-5 max-w-xl text-[15px] opacity-80">
              When you enter Focus, Velari disappears. Just your intention, a timer that counts beats not minutes, and a soft cue when it's time to come back.
            </p>
            <div className="mt-9 flex items-center gap-6">
              <div className="h-24 w-24 rounded-full border border-velari-cream/40 flex items-center justify-center breathe">
                <div className="font-display text-2xl">24:31</div>
              </div>
              <div>
                <div className="text-[11px] tracking-[0.18em] uppercase opacity-70">Now focusing on</div>
                <div className="font-editorial italic text-2xl">Draft the Velari manifesto</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="compare" className="px-4 md:px-8 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-[11px] tracking-[0.22em] uppercase text-velari-brand mb-3">How Velari is different</div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight max-w-3xl mb-10">
            We didn't build another to-do app. We built a daily ritual.
          </h2>
          <div className="rounded-2xl border border-velari-border overflow-hidden bg-velari-surface">
            <div className="grid grid-cols-4 text-[13px]">
              <div className="p-4 border-b border-velari-border text-velari-textSoft uppercase tracking-[0.16em] text-[11px]">Capability</div>
              <div className="p-4 border-b border-velari-border bg-velari-surfaceAlt font-display text-[15px]">Velari</div>
              <div className="p-4 border-b border-velari-border font-display text-[15px] text-velari-textSoft">Sunsama</div>
              <div className="p-4 border-b border-velari-border font-display text-[15px] text-velari-textSoft">Notion Calendar</div>
              {[
                ["AI day planner (Claude)", true, false, false],
                ["Cinematic focus mode", true, false, false],
                ["Energy-aware prioritization", true, false, false],
                ["Weekly reflection ritual", true, true, false],
                ["Built-in habits & streaks", true, false, false],
                ["Emotional UX, calm by design", true, false, false],
              ].map((row, i) => (
                <div key={i} className="contents">
                  <div className="p-4 border-t border-velari-border text-velari-text">{row[0]}</div>
                  <Cell on={row[1]} highlight />
                  <Cell on={row[2]} />
                  <Cell on={row[3]} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 md:px-8 py-20">
        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-4">
          {[
            { q: "It is the first productivity app that makes me feel quieter, not busier.", n: "Marina K.", r: "Designer, Berlin" },
            { q: "I open Velari before my email now. That's the whole review.", n: "Idris O.", r: "Founder, Lagos" },
            { q: "It's like Linear and Sunsama had a child who reads philosophy.", n: "Ben S.", r: "Engineering lead" },
          ].map((t, i) => (
            <figure key={i} className="rounded-2xl border border-velari-border bg-velari-surface p-7 flex flex-col gap-5">
              <Quote size={20} className="text-velari-brand" />
              <blockquote className="font-editorial italic text-[19px] leading-snug">{t.q}</blockquote>
              <figcaption className="mt-auto flex items-center gap-3">
                <img src={AVATARS[i]} className="h-9 w-9 rounded-full object-cover" alt="" />
                <div>
                  <div className="text-[13.5px] font-medium">{t.n}</div>
                  <div className="text-[12px] text-velari-textSoft">{t.r}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 md:px-8 py-24">
        <div className="mx-auto max-w-4xl rounded-[32px] bg-velari-ink text-velari-cream p-10 md:p-16 relative overflow-hidden">
          <img src={BRAND_ART} alt="" className="absolute -top-10 -right-10 w-72 opacity-30 pointer-events-none" />
          <div className="text-[11px] tracking-[0.22em] uppercase opacity-70 mb-4">Begin now</div>
          <h3 className="font-display text-4xl md:text-6xl tracking-tight leading-[1.05] max-w-2xl">
            Tomorrow morning, open Velari.
            <br />
            <span className="font-editorial italic opacity-90">Feel the difference.</span>
          </h3>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/signup"
              data-testid="cta-signup"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-velari-cream text-velari-ink text-[15px] font-medium hover:-translate-y-0.5 transition-transform ease-velari"
            >
              Create your free account
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full border border-velari-cream/30 text-[15px] hover:bg-white/5 transition-colors"
            >
              See plans
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-4 md:px-8 py-10 border-t border-velari-border">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4 text-[13px] text-velari-textSoft">
          <Logo />
          <div className="flex gap-5">
            <Link to="/pricing" className="hover:text-velari-text">Pricing</Link>
            <a href="#features" className="hover:text-velari-text">Features</a>
            <a href="#" className="hover:text-velari-text">Privacy</a>
            <a href="#" className="hover:text-velari-text">Terms</a>
          </div>
          <div>© 2026 Velari — Built quietly.</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ className = "", icon: Icon, title, text, accent }) {
  return (
    <div
      className={`${className} group rounded-2xl border border-velari-border bg-velari-surface p-6 hover:-translate-y-1 hover:shadow-lg transition-all ease-velari relative overflow-hidden`}
    >
      {accent && (
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-velari-brand/10 blur-2xl pointer-events-none" />
      )}
      <Icon size={20} className="text-velari-brand mb-4" />
      <div className="font-display text-[22px] tracking-tight mb-2">{title}</div>
      <p className="text-[14px] text-velari-textSoft leading-relaxed">{text}</p>
    </div>
  );
}

function Cell({ on, highlight = false }) {
  return (
    <div className={`p-4 border-t border-velari-border flex items-center ${highlight ? "bg-velari-surfaceAlt" : ""}`}>
      {on ? (
        <span className="inline-flex items-center gap-2 text-velari-brand text-[13px]">
          <Check size={15} />
          <span>Yes</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-velari-textSoft text-[13px]">
          <X size={15} />
          <span>—</span>
        </span>
      )}
    </div>
  );
}
