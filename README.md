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
3. **Create your one user account** — Supabase dashboard → Authentication → Users → Add user. ✅ Done
4. **Seed your recipes** — run `supabase/seed_recipes.sql` once in the SQL editor to load your 13 meals into the `recipes` table. Until you do this, the Weekly Planner falls back to the same placeholder list it always showed.
5. **All five screens are now wired to real Supabase data:**
   - **Today** — sleep, stress (+ follow-up note), yesterday's ratings, open tasks
   - **Workout** — tap Strength/Cardio/Rest to set the day (defaults to a Mon-strength/Tue-cardio alternation, override anytime), log your own exercises with planned vs. actual, daily step/active-minute/calorie-burn goals vs. actual
   - **Nutrition** — calories by meal and water intake, goal vs. actual
   - **Weekly Planner** — pick 7 meals, generate a deduplicated shopping list, paste in sermon notes (theme extraction is still a placeholder — see AI coaching below)
   - **Health Dashboard** — real week/month averages computed from your actual logs, not sample data
6. **Evening check-in was intentionally dropped** — the app is morning-only by design now. The Health Dashboard reflects that: it averages Stress and Sleep (both collected each morning) rather than the Physical/Mental/Spiritual ratings that would've needed an evening prompt. Those three columns still exist in `daily_logs` — harmless, just unused — in case you want them back later.
7. **Run `supabase/migration_2_intensity_and_weight.sql`** — adds `weigh_ins` (weekly weight tracking), `user_settings` (Strength/Cardio intensity level + restriction window), and a `workout_difficulty` column on `daily_logs`. The last statement seeds your settings row: light/light intensity, restricted through 2026-09-02.
8. **Weekly weigh-ins** — logged from the Weekly Planner screen. Your first entry becomes your starting weight; every entry after that is a check-in. The Nutrition screen's water goal reads whichever entry is most recent (standard guideline: ~half your body weight in fl oz/day) — it won't show a number until at least one weigh-in exists.
9. **Adaptive intensity, deterministic not AI-driven** — on purpose. The Workout screen shows your current Strength/Cardio intensity level and asks "How was this workout?" after you log it. Too hard steps the level down, too easy steps it up, just right holds — but only outside the restriction window. While `restricted_until` hasn't passed, intensity is locked to light regardless of what you rate, and that's shown on screen so it's never ambiguous why nothing moved.
10. **AI-generated strength workouts are live** — the "Generate my workout" button on the Workout screen calls `/api/generate-workout`, a server-side route using the Anthropic API. It picks 4-5 dumbbell/bodyweight exercises with sets/reps/weight matched to your current intensity level, capped at 50 lbs per dumbbell, plus a short coach's note. **Requires `ANTHROPIC_API_KEY` set in Vercel** (Project Settings → Environment Variables) — without it, the button shows a clear error instead of failing silently, and you can still fill in exercises manually. Cardio stays deterministic on purpose — duration/effort recommendation by level, no API call needed, since there's no real variety to generate there.
11. **Run `supabase/migration_3_journaling.sql`** — adds the mental health journal fields and spiritual reflection fields to `daily_logs`.
12. **Mental health journaling is live on the Today screen** — four prompts (what caused stress, what helped, what helped your mental health, anything else) plus a "Get feedback" button that calls `/api/journal-feedback`. It looks at the last 7 days of stress entries and your open tasks, and responds with one specific, actionable suggestion — never a diagnosis, and it's instructed to point toward a crisis line rather than try to solve anything that sounds like a real crisis.
13. **Spiritual reflection is live** — each morning, `/api/daily-reflection` pulls that week's sermon notes (from the Weekly Planner) and generates one specific reflection question plus a short "reminder of God's love" tied to a rotating scripture reference (see `lib/scriptureReferences.js`). **Deliberate design choice:** the reminder paraphrases the verse's theme rather than quoting exact NIV wording, since the model can't be trusted to reproduce translation-specific phrasing with certainty — the reference is always named so you can look up the exact text yourself. If verbatim quotations matter to you later, the right fix is a licensed source like scripture.api.bible, not the model's memory.
14. **Task list now supports adding tasks** directly from the Today screen.
15. **~~Meal suggestions on the Weekly Planner~~ — moved to the new Meal Library screen (see #26 below), superseded by the categorized redesign.**
16. **Calorie targets are now real, computed from your latest weigh-in** — `lib/calorieTargets.js` estimates maintenance calories from body weight alone (no height/age/sex stored yet, so this is a simplified estimate, not a full Mifflin-St Jeor calculation), then applies a deficit **capped at 1,000 cal/day** rather than the ~1,150 cal/day your stated 10 lb/month goal implies — that's a deliberate safety call, landing closer to a 2 lb/week pace, which sits within the commonly recommended safe range. The Nutrition screen shows the reasoning inline (maintenance estimate, target, deficit) so it's never a mystery number.
17. **Run `supabase/migration_4_weekly_review.sql`** — adds the `weekly_reviews` table.
18. **Weekly review is live on the Health Dashboard** — "Generate this week's review" pulls the week's logs (workouts + difficulty ratings, calorie/water/step adherence, weigh-in trend, journal entries, open tasks) into deterministic stats client-side, then sends those stats (not raw arithmetic) to `/api/weekly-review` for narrative synthesis: ratings for Physical/Mental/Spiritual, plus written notes on exercise, nutrition, and mental health, and one closing encouragement. Saved per week, so revisiting the same week shows the same review until you regenerate it.
19. **Run `supabase/migration_5_task_priority.sql`** — adds a `priority` column to `tasks` (Critical/Moderate/Low, defaults to Moderate).
20. **UI polish on the Today screen:** the mental health journal and spiritual reflection response now have explicit "Save" buttons with a "Saved ✓" confirmation, rather than relying only on silent auto-save on blur. Adding a task now includes a due-date picker and priority dropdown. Each open task shows a priority badge and has **Complete** (marks it done, removes it from the list) and **Edit** (inline — title, due date, priority) buttons. Tasks sort by priority first, then due date.
21. **Run `supabase/migration_6_phase3.sql`** — adds stress-based reflection columns, the `medications`/`medication_logs` tables, and nutrition-fact columns on `recipes`.
22. **Sermon Notes is now "Sermon Notes or Scripture"** — same field on the Weekly Planner, broader framing; feeds the daily reflection either way.
23. **Stress-responsive spiritual reflection** — a second, optional section on the Today screen's Spiritual Health card: "Get biblical encouragement" reads your mental health journal entries and responds with a short, paraphrased encouragement tied to a fitting scripture reference (drawn from the same curated pool as the daily love reminder). **Deliberately additive, not a replacement** for the daily sermon-based reflection — both show up, so spiritual content never becomes purely mood-reactive. Carries the same crisis-safety instruction as the mental health journal feedback.
24. **Medications & Supplements, on the Nutrition screen** — a plain log: name, dose, time of day, and a daily "Mark taken" toggle. Deliberately kept simple and isolated — no AI commentary on your regimen, and it's never sent to the journal feedback, weekly review, or any other AI feature. "Remove" soft-deletes (sets inactive) rather than destroying history.
25. **Nutrition facts on recipes** — calories and sodium, AI-estimated (fat was dropped from this by design — see #26). Existing recipes get an "Estimate nutrition" link once selected. **Sodium is explicitly labeled a rough estimate** everywhere it's shown — ingredient lists don't record brand or exact quantity, and condiments/sauces vary 3-4x by brand, so it's meaningfully less reliable than the calorie numbers. If sodium precision ever actually matters, the right fix is a real nutrition database (USDA FoodData Central or similar), not a better prompt.
26. **Run `supabase/migration_7_meal_library.sql`** — adds `category` to `recipes` (Breakfast/Lunch/Dinner/Snacks, existing rows default to Dinner), replaces the old fixed 7-slot `weekly_plans.meal_slots` with four flexible jsonb slot arrays (`dinner_slots`, `breakfast_slots`, `lunch_slots`, `snack_slots`), and adds `nutrition_selections` to `daily_logs`.
27. **New: Meal Library screen** (`/library`) — recipes organized by category with tabs. "Suggest meals" moved here from the Planner and is now category-aware (Breakfast suggestions look different from Snack suggestions). Manual "Add a meal" form too. Each recipe can be recategorized or deleted from here. Reached via a button from the Planner and from the Nutrition screen — deliberately not a 6th bottom-nav tab, to keep the nav uncrowded on mobile.
28. **Weekly Planner redesigned around categories:**
    - **Dinner** stays 7 fixed slots, as before.
    - **Breakfast, Lunch, and Snacks are now optional and additive** — "+ Add breakfast/lunch/snack" appends a slot up to a cap (7/7/4), each removable. Nothing forces all slots filled.
    - **Lunch slots can point at a Dinner slot as a leftover** — a "Leftovers" option group in the dropdown, labeled with that dinner's name. Choosing a leftover contributes nothing new to the shopping list, since those ingredients are already covered by the dinner pick — this is what actually makes the list complete rather than just longer.
    - **Ingredient substitutions, per slot, per week** — once a slot has a recipe, its ingredients show as editable inputs. Editing one doesn't touch the actual Library recipe unless you hit the "Save to Library" button that appears next to a changed ingredient — click it and the swap becomes permanent on the recipe itself; leave it alone and the substitution only applies to this week's plan and shopping list.
    - Shopping list generation now pulls from all four categories (minus leftover-type Lunch slots), fixing the original limitation where breakfasts/lunches never made it onto the list.
29. **Nutrition screen now selects meals instead of typing calories** — each of Breakfast/Lunch/Dinner/Snacks is a dropdown pulling from that category in your Meal Library. Picking a meal shows its calories against that meal's target and the over/under difference (e.g. "620 cal vs 700 target (−80 under)"). An empty category (most likely Breakfast, at first) says so plainly with a link straight to the Library rather than sitting there as an empty dropdown. Fat tracking was deliberately dropped from this screen entirely — "healthy" AI suggestions already imply reasonable fat content, and calories-only keeps the comparison easy to read at a glance.
7. **Email reminders** — pick a transactional email provider (Resend is the simplest to pair with Next.js) and a cron mechanism (Vercel Cron) for the four scheduled check-ins: 8:30 AM, 8:00 PM, Friday 5:00 PM, Sunday 1:00 PM.
8. **Google Health API** (steps/active minutes/calories, once you're ready) — not Google Fit, which stopped accepting new integrations in 2024 and is being retired. `health.googleapis.com` is the live successor; same OAuth2 pattern as the Google Calendar integration in you.accomplished.
9. **AI coaching** — scripture selection, stress advice, and sermon-theme reflections still come from `lib/mockData.js` placeholders. Wiring these to the Anthropic API is the same call pattern as you.accomplished's coaching pipeline.

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
