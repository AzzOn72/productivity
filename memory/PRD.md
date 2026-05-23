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

## Implemented (v1.0 — 2026-02-23)
- **Backend** (FastAPI + Mongo, `/api` prefix, JWT cookies + Bearer):
  - Email/password auth + Emergent Google session OAuth (unified User model).
  - Onboarding endpoint (goals, work style, chronotype, capacity, tone).
  - Tasks CRUD + AI quick-capture (natural language → structured task).
  - Habits with daily check-ins and streak calculation.
  - Calendar events (event / focus / break).
  - Focus sessions (start/complete + today total).
  - Weekly reviews + 7-day summary aggregate.
  - AI suite (Claude Sonnet 4.5 via Emergent LLM key): /chat, /prioritize, /plan-day, /weekly-insight.
  - Admin seeded on startup. Indexes on key fields.
- **Frontend** (React 19 + Tailwind + Shadcn primitives, Cabinet Grotesk + Manrope + Fraunces italic):
  - Marketing **Landing** — bento hero, philosophy strip, feature bento, focus mode preview, vs. Sunsama comparison, testimonials, final CTA.
  - **Pricing** — three tiers, "luxury" Elite card, full comparison, FAQ.
  - **Login** / **Signup** — split-screen premium, Google + email/password.
  - **Onboarding** — 4 calm steps with intent words.
  - **Today dashboard** — greeting + N×4 stat strip + 3-column emotional center (habits/quick capture, AI-prioritized priorities, schedule + focus card).
  - **Tasks** — list with priority pills, filters, search, quick add.
  - **Calendar** — week grid with hourly slots, click-to-create modal.
  - **Focus** — cinematic fullscreen, intent capture, preset durations (25/50/90), ring countdown, breathe animation.
  - **Weekly Review** — 4-step stepper with AI reflection step.
  - **Settings** + global **AI Coach** drawer.
- Test pass: 19/19 backend (pytest), 10/10 frontend smoke.

## Backlog
### P1 — Next iteration
- Stripe checkout wired to Pro / Elite (currently UI-only).
- Drag-to-reschedule on Calendar; render tasks beside events.
- Habit detail screen with weekly heatmap.
- AI weekly insight: deeper charts (Recharts), trends across reviews.
- Goals & quarter planning module (Elite).
- Mobile gesture polish + native share to "Quick capture".

### P2
- Premium themes (Elite): Obsidian, Ivory, Sage, Editorial.
- Calendar sync (Google / iCal subscription).
- Reminder cron + email digest (Resend).
- Live focus music integration.
- Public profile / quiet share page for habits or weekly wins.

### P3
- Native mobile app (React Native).
- Browser extension for quick capture.
- API & webhooks (Elite).

## Tech notes
- Mongo via `MONGO_URL`; DB name via `DB_NAME`.
- AI uses `anthropic/claude-sonnet-4-5-20250929` through `emergentintegrations`.
- All routes prefixed `/api`. Cookies: httpOnly, secure, sameSite=None.
- JWT also returned in JSON for resilient Bearer header on cross-origin.
