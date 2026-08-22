-- Wellness Tracker schema
-- Run this in the Supabase SQL editor on a fresh project.
-- Assumes Supabase Auth (auth.users) for the single-user account.

create table recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  ingredients text[] not null default '{}',
  created_at timestamptz default now()
);

create table weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start date not null,
  meal_slots uuid[] not null default '{}', -- 7 recipe ids, in order
  shopping_list text[] default '{}',
  calendar_preview jsonb default '[]',
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

create table sermon_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start date not null,
  raw_notes text,
  themes text[] default '{}', -- 2-3 extracted themes, one used per day
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  log_date date not null,

  -- morning
  sleep_rating text check (sleep_rating in ('poor', 'average', 'great')),
  stress_rating int check (stress_rating between 1 and 5),
  stress_note text,
  stress_advice_given text,
  stress_advice_felt_doable boolean,
  sermon_theme_of_day text,

  -- workout (strength or cardio, matches that day's rotation)
  workout_type text check (workout_type in ('strength', 'cardio', 'rest')),
  workout_planned jsonb default '[]', -- [{exercise, reps/level, weight/duration, circuits}]
  workout_actual jsonb default '[]',
  steps_goal int, steps_actual int,
  active_minutes_goal int, active_minutes_actual int,
  calories_burned_goal int, calories_burned_actual int,

  -- nutrition
  nutrition_planned jsonb default '{}', -- {breakfast, lunch, dinner, snacks, water_oz}
  nutrition_actual jsonb default '{}',

  -- evening
  physical_rating int check (physical_rating between 1 and 5),
  mental_rating int check (mental_rating between 1 and 5),
  spiritual_rating int check (spiritual_rating between 1 and 5),

  created_at timestamptz default now(),
  unique (user_id, log_date)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  due_date date,
  source text default 'wellness_tracker', -- vs. synced from ADO, etc.
  completed boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security: every table is single-user, but lock it down anyway.
alter table recipes enable row level security;
alter table weekly_plans enable row level security;
alter table sermon_notes enable row level security;
alter table daily_logs enable row level security;
alter table tasks enable row level security;

create policy "owner only" on recipes for all using (auth.uid() = user_id);
create policy "owner only" on weekly_plans for all using (auth.uid() = user_id);
create policy "owner only" on sermon_notes for all using (auth.uid() = user_id);
create policy "owner only" on daily_logs for all using (auth.uid() = user_id);
create policy "owner only" on tasks for all using (auth.uid() = user_id);
