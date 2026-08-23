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

1. **Create a Supabase project** and run `supabase/schema.sql` in the SQL editor. ✅ Done
2. **Set env vars** — handled automatically if you used the Vercel↔Supabase integration. Just remember: `NEXT_PUBLIC_*` values are baked in at *build* time, so redeploy after they're added or changed.
3. **Create your one user account** — Supabase dashboard → Authentication → Users → Add user. Enter an email and password; this is the only account the app supports (it's single-user by design, no public sign-up). Use that email/password on the `/login` screen.
4. **The Today screen is now wired to real data** — sleep rating, stress rating, and the stress follow-up note save to `daily_logs` as you tap/type. Yesterday's ratings and today's tasks read from the same tables. The other four screens (Workout, Nutrition, Weekly Planner, Health Dashboard) still show placeholder data from `lib/mockData.js` — same upsert pattern as `app/page.js`, just needs to be repeated per screen.
5. **Email reminders** — pick a transactional email provider (Resend is the simplest to pair with Next.js) and a cron mechanism (Vercel Cron) for the four scheduled check-ins: 8:30 AM, 8:00 PM, Friday 5:00 PM, Sunday 1:00 PM.
6. **Google Health API** (steps/active minutes/calories, once you're ready) — not Google Fit, which stopped accepting new integrations in 2024 and is being retired. `health.googleapis.com` is the live successor; same OAuth2 pattern as the Google Calendar integration in you.accomplished.
7. **AI coaching** — scripture selection, stress advice, and sermon-theme reflections still come from `lib/mockData.js` placeholders. Wiring these to the Anthropic API is the same call pattern as you.accomplished's coaching pipeline.

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
