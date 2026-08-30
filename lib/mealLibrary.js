export const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const MEDICATION_TIMES = ['Morning', 'Night', 'Anytime']

export const CATEGORY_SLOT_LIMITS = {
  Dinner: 7,
  Breakfast: 7,
  Lunch: 7,
  Snacks: 4,
}

// Empty-slot template per category. Dinner/Breakfast/Snacks slots are
// {recipeId, ingredients, day}; Lunch slots can additionally be a leftover
// reference: {type: 'leftover', dinnerIndex, day}. `day` is 0-6
// (Monday-Sunday) or null for "not tied to a specific day" — only slots
// with a day set can be defaulted into on the Nutrition screen.
export function emptySlot(day = null) {
  return { recipeId: '', ingredients: null, day }
}
