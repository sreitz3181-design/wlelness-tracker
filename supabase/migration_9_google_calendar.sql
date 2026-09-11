-- Migration 9: Google Calendar integration
-- Run this in the Supabase SQL editor after migration_8.

create table google_calendar_connections (
  user_id uuid primary key references auth.users not null,
  refresh_token text not null,
  connected_at timestamptz default now()
);
alter table google_calendar_connections enable row level security;
create policy "owner only" on google_calendar_connections for all using (auth.uid() = user_id);
