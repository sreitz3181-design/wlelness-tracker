-- Migration 6: Phase 3 — stress-responsive spiritual reflection,
-- medications/supplements, and nutrition facts on recipes.
-- Run this in the Supabase SQL editor after migration_5.

alter table daily_logs add column if not exists stress_based_reflection text;
alter table daily_logs add column if not exists stress_based_reference text;

create table medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  dose text,
  time_of_day text,
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table medications enable row level security;
create policy "owner only" on medications for all using (auth.uid() = user_id);

create table medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  medication_id uuid references medications(id) on delete cascade not null,
  log_date date not null,
  taken boolean not null default true,
  created_at timestamptz default now(),
  unique (user_id, medication_id, log_date)
);
alter table medication_logs enable row level security;
create policy "owner only" on medication_logs for all using (auth.uid() = user_id);

-- Nutrition facts, AI-estimated. Sodium is deliberately less reliable than
-- calories/fat — ingredient lists don't record brand or exact quantity,
-- and sauces/condiments vary 3-4x by brand — so it's surfaced in the UI
-- as a rough estimate, not treated as equally trustworthy.
alter table recipes add column if not exists calories int;
alter table recipes add column if not exists fat_g numeric;
alter table recipes add column if not exists sodium_mg numeric;
