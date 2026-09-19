# Wellness Tracker — Update Workflow

Reference doc for applying updates to this project. Keep this in Claude
Project knowledge (the project folder itself is also attached to the project).

## Repo & deployment

- **GitHub repo:** `sreitz3181-design/wlelness-tracker` — the "wlelness" typo in
  the name is kept on purpose; the repo was never renamed. Local folder is
  `C:\Users\sreit\wlelness-tracker`, branch `main`, remote `origin`.
- **Local folder:** should be a real git clone of that repo — check with `git status`
  inside it; if it says "not a git repository," you're in the wrong folder.
  This has happened before from unzipping an update into a fresh folder instead
  of the actual cloned repo. **Always extract new zips directly into the
  existing cloned folder**, overwriting files, rather than letting Windows
  create a new folder somewhere else.
- **Zips never delete files.** Overwriting a folder adds and replaces files but
  leaves behind anything that was removed in a newer version. When an update
  says a file or folder was removed, delete it by hand in File Explorer before
  `git add .` (which will then stage the deletion).
- **Hosting:** Vercel, connected to the GitHub repo — pushes to `main` auto-deploy.
- **Database:** Supabase — schema changes are never automatic, see below.

## Every time you get a code update

1. Unzip the new files directly into your existing cloned project folder,
   overwriting when prompted.
2. Open Command Prompt **inside that folder** (click the folder's address bar
   in File Explorer, type `cmd`, Enter — lands you there directly).
3. Confirm you're in the right place: `git status` should say something like
   "On branch main," not "fatal: not a git repository."
4. Run:
   ```
   git add .
   git commit -m "describe the update"
   git push
   ```
5. Vercel redeploys automatically within a minute or two — no separate step needed.

## Every time a Supabase migration is needed

Claude will always say explicitly whether one is needed, and paste the SQL
directly in the reply — no need to dig into the `supabase/` folder yourself.

1. Go to supabase.com → your project → **SQL Editor** → **New query**.
2. Paste the SQL exactly as given.
3. Click **Run**.
4. Optional sanity check: **Table Editor** in the sidebar should show all the
   expected tables. As of the last full check, that's: `daily_logs`,
   `recipes`, `sermon_notes`, `tasks`, `weekly_plans`, `weigh_ins`,
   `user_settings`, `weekly_reviews`, `medications`, `medication_logs`,
   `grocery_items`.

**This step is easy to forget** — it's the single most common source of
"a feature isn't working" after an update, since the code can be live on
Vercel while the database underneath it is still missing a table or column
the new code expects.

## One-time setup on a new computer

```
git clone https://github.com/sreitz3181-design/wlelness-tracker.git
cd wlelness-tracker
npm install
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

`.env.local` (only needed if you want to run the app locally with `npm run
dev` — not needed just to push updates) is never included in the zip or the
repo on purpose, since it holds secrets. Recreate it from
`.env.local.example` and Vercel's Environment Variables if you ever want to
preview changes on your own machine before they're live.

## Known gotchas, already hit once

- **PowerShell blocks `npm` scripts by default** ("running scripts is
  disabled on this system"). Either run commands from Command Prompt instead
  of PowerShell, or run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
  once in PowerShell to allow it there too.
- **The Vercel Toolbar can overlay the live app** if you're signed into
  Vercel in that browser — it's a Vercel feature, not a bug in the app.
  Turned off already in Vercel → Settings → General → Vercel Toolbar →
  Production Deployments → Off.
- **Meal selections and other choices auto-save immediately** everywhere in
  the app now — nothing requires a separate "save" step to actually persist,
  other than the couple of screens with an explicit Save button (the
  mental health journal, spiritual reflection response) where the button
  exists specifically to give you a visible confirmation, not because it's
  the only way it saves.

## Decisions & current status

- **Repo name:** keeping the `wlelness-tracker` typo (GitHub repo and local folder).
- **Google Calendar integration: removed** (Sept 2026). Code deleted
  (`app/api/calendar`, `app/api/auth`, `lib/googleCalendar.js`,
  `lib/supabaseAdmin.js`, `supabase/migration_9_google_calendar.sql`), the
  `google_calendar_connections` table dropped in Supabase, and no
  `SUPABASE_SERVICE_ROLE_KEY` or `GOOGLE_*` variables should remain in Vercel.
- **Email reminders:** working as built, but deliberately not being worked on
  for now. The cron times in `vercel.json` are fixed UTC and shift by an hour
  when daylight saving changes (next change: Sunday, Nov 1, 2026).
