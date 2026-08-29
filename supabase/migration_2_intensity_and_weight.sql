-- Migration 2: body weight tracking + adaptive workout intensity baseline
-- Run this in the Supabase SQL editor after schema.sql (safe to run once).

create table weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  weigh_date date not null,
  weight_lbs numeric not null,
  created_at timestamptz default now(),
  unique (user_id, weigh_date)
);
alter table weigh_ins enable row level security;
create policy "owner only" on weigh_ins for all using (auth.uid() = user_id);

-- One row per user. Tracks the current Strength/Cardio intensity level and
-- an optional restriction window that forces 'light' regardless of history.
create table user_settings (
  user_id uuid primary key references auth.users not null,
  strength_intensity text not null default 'light' check (strength_intensity in ('light', 'moderate', 'high')),
  cardio_effort text not null default 'light' check (cardio_effort in ('light', 'moderate', 'high')),
  restricted_until date,
  updated_at timestamptz default now()
);
alter table user_settings enable row level security;
create policy "owner only" on user_settings for all using (auth.uid() = user_id);

-- One rating per completed workout, feeding the intensity step logic.
alter table daily_logs add column if not exists workout_difficulty text
  check (workout_difficulty in ('too_easy', 'just_right', 'too_hard'));

-- Seed your settings row: light/light, restricted through 9/2/2026.
-- Run this after the tables above exist.
insert into user_settings (user_id, strength_intensity, cardio_effort, restricted_until)
values ((select id from auth.users limit 1), 'light', 'light', '2026-09-02')
on conflict (user_id) do update set
  strength_intensity = 'light',
  cardio_effort = 'light',
  restricted_until = '2026-09-02';
