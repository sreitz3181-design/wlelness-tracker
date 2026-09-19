-- Migration 10: quantity and unit on grocery items.
-- Run this in the Supabase SQL editor BEFORE deploying the matching code.
-- Safe to run more than once. Existing rows get quantity 1 and no unit.

alter table grocery_items add column if not exists quantity numeric not null default 1;
alter table grocery_items add column if not exists unit text not null default '';
alter table grocery_items drop constraint if exists grocery_items_quantity_positive;
alter table grocery_items add constraint grocery_items_quantity_positive check (quantity > 0);
