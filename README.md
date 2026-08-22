# Wellness Tracker

A personal physical/mental/spiritual health tracker — Next.js + Supabase + the Anthropic API, matching the six screens sketched in the rough wireframes (Weekly Planner, Daily Task, Strength/Cardio Workout, Nutrition, Health Dashboard).

Every page currently renders from `lib/mockData.js` so you can see the real layout before wiring up a database. Nothing here talks to a live backend yet.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the bottom nav (Today / Workout / Nutrition / Planner / Progress) matches the five screens.

## Design tokens

Palette and type are in `tailwind.config.js` and `app/globals.css`:
- **Sage** (physical), **Dusk** (spiritual), **Amber** (encouragement/tasks), **Rose** (stress) as the four tonal accents
- **Fraunces** for headings, **Inter** for body text, **IBM Plex Mono** for all planned-vs-actual numbers, so data reads as data
- The one signature element is the "rhythm arc" gradient bar (dawn → dusk) at the top of the Today screen — nowhere else, so it stays meaningful rather than decorative

## Next steps to make it real

1. **Create a Supabase project** and run `supabase/schema.sql` in the SQL editor. It covers recipes, weekly plans, sermon notes, daily logs (sleep/stress/workout/nutrition/evening ratings), and tasks — all scoped with row-level security to one user.
2. **Set env vars** — copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from your Supabase project settings)
   - `ANTHROPIC_API_KEY` (for the stress-advice, scripture-selection, and sermon-theme coaching logic — same pattern as you.accomplished's AI coaching)
3. **Swap `mockData.js` imports for `supabase` queries** in each page — `lib/supabaseClient.js` is already set up, just unused so far. Each mock export's shape matches a `daily_logs` column or table, so this should be a fairly mechanical swap.
4. **Email reminders** — pick a transactional email provider (Resend is the simplest to pair with Next.js) and a cron mechanism (Vercel Cron or Supabase Edge Functions) for the four scheduled check-ins: 8:30 AM, 8:00 PM, Friday 5:00 PM, Sunday 1:00 PM.
5. **Google Health API** (steps/active minutes/calories, once you're ready) — not Google Fit, which stopped accepting new integrations in 2024 and is being retired. `health.googleapis.com` is the live successor; same OAuth2 pattern as the Google Calendar integration in you.accomplished.
6. **Deploy** — Vercel is the natural fit for a Next.js + Supabase app and solves the "not on mobile" problem this was built to fix.

## Structure

```
app/
  page.js                 Today (Daily Task) — scripture, yesterday's ratings, tasks
  workout/page.js          Strength/Cardio, planned vs. actual, daily health goals
  nutrition/page.js        Calories by meal + water, goal vs. actual
  weekly-planner/page.js   7-meal picker → shopping list, calendar, sermon notes upload
  health-dashboard/page.js Week/month toggle, averages across all five metrics
components/
  NavBar.js                Bottom tab nav (mobile-first)
  ui.js                    Card, RatingScale, PlannedActualRow, StatPill
lib/
  mockData.js               Placeholder data — replace with Supabase queries
  supabaseClient.js         Supabase client (needs env vars to do anything)
supabase/
  schema.sql                Full schema + RLS policies
```
