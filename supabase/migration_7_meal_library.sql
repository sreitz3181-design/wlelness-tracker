-- Migration 7: Meal Library, categorized planning, ingredient
-- substitutions, and recipe-based nutrition selection.
-- Run this in the Supabase SQL editor after migration_6.

-- Categorize recipes. Existing rows default to Dinner (your original 13
-- were all dinner-style entrees) — recategorize any of them from the new
-- Meal Library screen afterward.
alter table recipes add column if not exists category text not null default 'Dinner'
  check (category in ('Breakfast', 'Lunch', 'Dinner', 'Snacks'));

-- New flexible per-category slot storage for weekly_plans, replacing the
-- old fixed 7-slot `meal_slots` uuid[] (left in place, unused, for safety —
-- nothing reads it anymore). Each slot is:
--   Dinner/Breakfast/Snacks: {"recipeId": "...", "ingredients": [...] | null}
--     (ingredients is a per-week substitution override; null means "use
--     the recipe's own ingredient list")
--   Lunch: either the same shape as above, OR
--          {"type": "leftover", "dinnerIndex": 0} referencing a Dinner
--          slot by position — contributes nothing new to the shopping list.
alter table weekly_plans add column if not exists dinner_slots jsonb not null default '[]';
alter table weekly_plans add column if not exists breakfast_slots jsonb not null default '[]';
alter table weekly_plans add column if not exists lunch_slots jsonb not null default '[]';
alter table weekly_plans add column if not exists snack_slots jsonb not null default '[]';

-- Which recipe was eaten for each meal today, for the Nutrition screen's
-- calorie-vs-target comparison. Separate from nutrition_actual (which
-- still holds the raw calorie numbers, now populated from the selected
-- recipe instead of typed by hand).
alter table daily_logs add column if not exists nutrition_selections jsonb not null default '{}';
