-- Migration 4: weekly review synthesis
-- Run this in the Supabase SQL editor after migration_3.

create table weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start date not null,
  physical_rating numeric,
  mental_rating numeric,
  spiritual_rating numeric,
  exercise_narrative text,
  nutrition_narrative text,
  mental_health_narrative text,
  encouragement text,
  created_at timestamptz default now(),
  unique (user_id, week_start)
);
alter table weekly_reviews enable row level security;
create policy "owner only" on weekly_reviews for all using (auth.uid() = user_id);
