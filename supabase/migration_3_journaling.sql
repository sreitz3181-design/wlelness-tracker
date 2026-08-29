-- Migration 3: mental health journaling + spiritual reflection
-- Run this in the Supabase SQL editor after migration_2.

alter table daily_logs add column if not exists stress_cause text;
alter table daily_logs add column if not exists stress_helped text;
alter table daily_logs add column if not exists mental_health_helpers text;
alter table daily_logs add column if not exists additional_share text;
alter table daily_logs add column if not exists mental_health_feedback text;

alter table daily_logs add column if not exists spiritual_reflection_question text;
alter table daily_logs add column if not exists spiritual_reflection_response text;
alter table daily_logs add column if not exists daily_love_reminder text;
alter table daily_logs add column if not exists daily_love_reference text;
