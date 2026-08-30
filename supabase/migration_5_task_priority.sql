-- Migration 5: task priority
-- Run this in the Supabase SQL editor after migration_4.

alter table tasks add column if not exists priority text default 'Moderate'
  check (priority in ('Critical', 'Moderate', 'Low'));
