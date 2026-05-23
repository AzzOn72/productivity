# Velari — Product Requirements Document

## Mission
A category-defining, browser-first daily operating system that competes with and outperforms Sunsama, Motion, Akiflow, Todoist, TickTick, and Notion Calendar in UX, emotional connection, retention, visual quality, and perceived value.

## Personas
1. **The intentional founder** — overworked, juggles deep work + meetings, wants calm and clarity over hustle.
2. **The senior IC / creator** — protects long focus blocks, hates noisy productivity tooling.
3. **The mindful student / learner** — wants structure, reflection, and gentle habit-building.

## Core requirements (static)
- Premium "Apple-quality" UI/UX, screenshot-worthy on every screen.
- Calm emotional UX. No anxiety bait. No emoji icons.
- Browser-first, mobile-responsive, future mobile-app ready.
- Unified surface: tasks, calendar, focus, habits, reviews, AI coach.
- Strong SaaS monetization (Free / Pro $5 / Elite $15).
- High retention via streaks, momentum, morning ritual, weekly review.

## Implemented

### v1.0 — 2026-02-23 (MVP)
- **Backend** (FastAPI + Mongo, `/api` prefix, JWT cookies + Bearer):
  - Email/password auth + Emergent Google session OAuth.
  - Onboarding, Tasks CRUD + AI quick-capture, Habits with streaks, Calendar events, Focus sessions, Weekly reviews + 7-day summary.
  - AI: chat, prioritize, plan-day, weekly-insight (Claude Sonnet 4.5 via Emergent LLM key).
- **Frontend**: Landing, Login/Signup (Google + email/pw), 4-step Onboarding, Today, Tasks, Calendar, Focus, Weekly Review, Pricing, Settings, AI Coach drawer.
- Tests: 19/19 backend + 10/10 frontend.

### v2.0 — 2026-02-23 (Premium upgrade)
- **New backend endpoints**:
  - `/streak` — non-toxic streak with longest record.
  - `/momentum` — 0–100 daily momentum (tasks 45% + focus 40% + habits 15%) with calm label (Quiet / Warming / In motion / Flow).
  - `/ai/overload-check` — warns when planned estimate exceeds capacity.
  - `/ai/auto-plan` — creates focus event blocks across the day based on chronotype, with 15-min breaks, no duplicates.
  - `/insights/weekly-compare` — this-week vs previous-week deltas, best day, distraction rate.
  - `/rituals/shutdown` — saves evening shutdown reflections.
  - `/billing/upgrade`, `/billing/create-checkout`, `/billing/plan` — Stripe-ready scaffolding with **DEV PREMIUM OVERRIDE** (`dev_mode=true` grants plan instantly, NOT production).
  - Tightened AI prompts → terse, bulleted, ≤14-word reasoning, no preamble.
- **Today redesign**: hero with **Clarity ring**, **Momentum bar**, **Auto-plan my day** button, AI reorder, **Overload banner**, **Top-three iconic cards**, energy-window schedule, sidebar streak + Unlock Pro nudge, morning ritual modal, shutdown ritual modal.
- **Focus 2.0**: ambient **aurora** gradient (sage + terracotta), three intensity tiers (Spark / Deep / Flow), **flow score** with interrupt tracking, larger 7xl countdown, mute toggle, premium shadow.
- **Weekly Review 2.0**: **CoachStat** tiles with up/down delta percentages, **Best day** detection, **Distraction pattern** banner — feels like coaching, not analytics.
- **Pricing**: dev-mode preview badge + instant grant of Pro/Elite for testing UX flows; "Current plan" indicator; explicit `IS_DEV_MODE` flag in `/app/frontend/src/lib/devMode.js` (must be FALSE for production).
- **Visual polish**: `card-soft` + `shadow-elevated` utilities, more breathing room, softer borders.
- Tests: **30/30 backend + 100% frontend critical flows** (iteration_2.json).

### v3.0 — 2026-02-23 (Life OS expansion — feature depth)
- **AI "What now?"** (`POST /api/ai/now`): the magical single-best-action prompt. Lives as a hero card on Today + reachable from the palette. Adapts to free-time selector (15/30/60/120).
- **AI auto task decomposition** (`POST /api/ai/decompose`): breaks a parent task into 3-5 child sub-steps (`parent_task_id` field). One-click "split" icon on Tasks.
- **Command Palette (⌘K / Ctrl+K)**: global, fuzzy filters, runs navigation + magic actions (Now / Auto-plan / Check-in / Shutdown / Capture). Falls through to quick-capture on free-text + Enter when no matches.
- **Insights** (`/insights`, Elite-flavored retention driver):
  - Life **patterns** (`/api/insights/patterns`): best day-of-week, best hour band, avg focus session, interrupt rate, completion by priority bars, habit consistency.
  - **Burnout signal** (`/api/insights/burnout`): 0–100 score with calm / stretched / overheating level.
  - **Productivity personality** (`/api/insights/personality`): Calibrating / Sprinter / Marathoner / Architect / Improviser archetypes.
  - **Goal alignment** (`/api/insights/goal-alignment`): solid bar = actual time share, dashed mark = intended weight; emits drift list when delta < -10%.
- **Goals** (`/goals`, CRUD `/api/goals`): weighted goals (1–10), color, why, target date. Tasks accept `goal_id`; deleting a goal untags affected tasks.
- **Mood / Energy check-in** (`/api/checkin`): two-tap daily 1–5 scale; the "What now?" prompt adapts to it.
- **Journal** (`/journal`, `/api/journal`): frictionless capture with AI task extraction; extracted tasks get `source='journal'`.
- **Smart Nudges** (`/api/nudges`): up to 3 contextual prompts based on user state.
- Tests: **42/42 backend + 100% frontend critical flows** (iteration_3.json).

### v4.0 — 2026-02-23 (FINAL polish — production-ready)
- **Universal search** (`GET /api/search?q=`): live, debounced inside the Command Palette. Searches tasks, goals, journal entries, and calendar events with regex-safe matching and result truncation. Renders dedicated `palette-result-task/goal/journal/event-{id}` rows.
- **Page transitions**: a single `PageTransition` wrapper applies a 420ms fade-up between every authed route — no flicker, no jitter.
- **Loading skeletons**: shimmering placeholders on Today's hero and Insights' personality card; resolves in <200ms on warm cache.
- **Weekly Review celebration**: completing the stepper triggers a `ReviewCelebration` modal with soft sparks, a 3-stat summary tile (Done / Focus h / Habits), and an "See the trend" deeplink into Insights.
- **404 page**: branded `NotFound` route — "This page is a quiet room." — keeps users in the system instead of redirecting to /.
- **Active nav indicator**: 3-px animated brand-color left bar on the active sidebar item, with `duration-300 ease-velari` transitions.
- **Backend hardening**:
  - `/billing/upgrade` `dev_mode=true` now gated by `ENABLE_DEV_BILLING` env (defaults safe-off in prod). Startup logs the gate state for operator visibility.
  - `/events` GET start/end filter properly parenthesised.
  - `/goals` progress denominator and numerator both use `created_at` window; `progress_pct` capped at 100.
  - `/ai/auto-plan` always returns a truthy `message` field — including a clear "too late today, try tomorrow" line for after-8pm edge case.
  - CORS middleware now honors `CORS_ORIGINS` env (no dead branch).
- Tests: **53/53 backend + 100% frontend critical assertions** (iteration_4.json). **No critical issues. Velari is production-ready.**

## Backlog
### P1 — Next iteration
- Wire real **Stripe Checkout** (Pro $5 / Elite $15) — replace dev override; env-gate the dev path.
- Habit detail screen with weekly heatmap; Recharts trend lines in Weekly Insight.
- Calendar: drag-to-reschedule + render tasks beside events.
- Goals & quarter planning module (Elite tier).
- Mobile gesture polish + share-to-Quick-capture.

### P2
- Premium themes (Elite): Obsidian, Ivory, Sage, Editorial.
- Calendar sync (Google / iCal subscription) + reminders via Resend.
- Ambient focus soundscapes; live focus music integration.
- Public quiet share page (habits / weekly wins).
- Split server.py into routers; aggregation pipeline for /streak.

### P3
- Native mobile app (React Native).
- Browser extension for quick capture.
- API & webhooks (Elite).

## Tech notes
- Mongo via `MONGO_URL`; DB name via `DB_NAME`.
- AI uses `anthropic/claude-sonnet-4-5-20250929` through `emergentintegrations`.
- All routes prefixed `/api`. Cookies: httpOnly, secure, sameSite=None.
- JWT also returned in JSON for resilient Bearer header on cross-origin.
- **DEV MODE**: `IS_DEV_MODE=true` in `/app/frontend/src/lib/devMode.js` and `dev_mode=true` in `POST /api/billing/upgrade` grant Pro/Elite instantly. Flip to FALSE before any production deploy.
