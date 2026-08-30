export const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

export const CATEGORY_SLOT_LIMITS = {
  Dinner: 7,
  Breakfast: 7,
  Lunch: 7,
  Snacks: 4,
}

// Empty-slot template per category. Dinner/Breakfast/Snacks slots are
// {recipeId, ingredients}; Lunch slots can additionally be a leftover
// reference: {type: 'leftover', dinnerIndex}.
export function emptySlot() {
  return { recipeId: '', ingredients: null }
}
