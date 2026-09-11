-- Migration 8: standalone categorized Grocery List screen.
-- Run this in the Supabase SQL editor after migration_7.

create table grocery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start date not null,
  category text not null check (category in
    ('Produce', 'Bakery', 'Meat', 'Grocery', 'Frozen', 'Dairy', 'Personal Hygiene', 'Household', 'Other')),
  name text not null,
  checked boolean not null default false,
  -- 'generated' items get replaced each time the Weekly Planner regenerates
  -- the shopping list; 'manual' items (added directly on the Grocery List
  -- screen) are left alone.
  source text not null default 'manual' check (source in ('generated', 'manual')),
  created_at timestamptz default now()
);
alter table grocery_items enable row level security;
create policy "owner only" on grocery_items for all using (auth.uid() = user_id);
create index grocery_items_week_idx on grocery_items (user_id, week_start);
