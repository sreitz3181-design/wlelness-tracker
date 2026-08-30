// Placeholder data so every screen renders during local dev, before
// Supabase is connected. Replace each export with a real query once
// lib/supabaseClient.js has a live project — see README.

export const todayScripture = {
  reference: 'Psalm 23:1 (NIV)',
  verse: 'The LORD is my shepherd, I lack nothing.',
  encouragement:
    "Bring what's weighing on you before God this morning — He isn't surprised by any of it.",
  sermonTheme: 'Trusting God with outcomes you cannot control',
}

export const todaysTasks = [
  { id: 1, title: 'Finish sprint ticket review', due: 'Today' },
  { id: 2, title: 'Prep 1:1 talking points', due: 'Tomorrow' },
  { id: 3, title: 'Follow up on open PR', due: 'This week' },
]

export const yesterdayRatings = {
  physical: 4,
  mental: 3,
  spiritual: 4,
  sleep: 3,
  stress: 2,
}

export const todaysWorkout = {
  type: 'Strength',
  exercises: [
    { name: 'Bench Press', repsPlanned: 10, weightPlanned: '135 lbs', repsActual: null, weightActual: null, circuits: 3 },
    { name: 'Bent-Over Rows', repsPlanned: 10, weightPlanned: '95 lbs', repsActual: null, weightActual: null, circuits: 3 },
    { name: 'Goblet Squats', repsPlanned: 12, weightPlanned: '35 lbs', repsActual: null, weightActual: null, circuits: 3 },
  ],
  cardio: null,
  dailyGoals: {
    steps: { goal: 11000, actual: null },
    activeMinutes: { goal: 90, actual: null },
    caloriesBurned: { goal: 1000, actual: null },
  },
}

export const todaysNutrition = [
  { meal: 'Breakfast', goalCalories: 500, actualCalories: null },
  { meal: 'Lunch', goalCalories: 700, actualCalories: null },
  { meal: 'Dinner', goalCalories: 800, actualCalories: null },
  { meal: 'Snacks', goalCalories: 300, actualCalories: null },
]
export const waterGoalOz = 100

export const recipes = [
  { id: 'chicken-tacos', name: 'Chicken Tacos', ingredients: ['Carb Friendly Tortillas', 'Chicken Broth', 'Tomato Sauce', 'Chipotle Peppers', '2 Chicken Breast', 'Shredded Colby Jack Cheese'], category: 'Dinner' },
  { id: 'salmon-broccoli', name: 'Salmon & Broccoli', ingredients: ['Salmon', 'Garlic', 'Lemon', 'Frozen Broccoli'], category: 'Dinner' },
  { id: 'chicken-kale-salad', name: 'Chicken/Kale Salad', ingredients: ['Sweet Kale Salad Mix', 'Blueberries', 'Grilled Chicken'], category: 'Dinner' },
  { id: 'southwest-chicken-salad', name: 'Southwest Chicken Salad', ingredients: ['Mexican Corn Salad Mix', 'Grilled Chicken'], category: 'Dinner' },
  { id: 'sushi-bowls', name: 'Sushi Bowls', ingredients: ['2 Brown Rice', 'Frozen Mahi-Mahi', 'Pineapple', 'Mango', 'Cilantro', 'Red Onion', 'Cilantro Avocado Dressing'], category: 'Dinner' },
  { id: 'grilled-chicken-breast', name: 'Grilled Chicken Breast', ingredients: ['4 Chicken Breast', 'Garlic Herb Seasoning', 'Avocado Oil', 'Frozen Broccoli (or Green Beans)'], category: 'Dinner' },
  { id: 'chicken-burrito-bowls', name: 'Chicken Burrito Bowls', ingredients: ['2 Chicken Breast', '2 Brown Rice', 'Cilantro', 'Lime', 'Shredded Colby Jack Cheese'], category: 'Dinner' },
  { id: 'bbc-chicken', name: 'BBC Chicken', ingredients: ['Whole Chicken', 'Butter Garlic Rub', '2 Sweet Potatoes'], category: 'Dinner' },
  { id: 'sesame-chicken', name: 'Sesame Chicken', ingredients: ['Brown Rice', '2 Chicken Breasts', 'Red Bell Pepper', 'Fresh Broccoli', 'Fresh Snap Peas', 'Red Onion', 'Sesame Teriyaki Sauce'], category: 'Dinner' },
  { id: 'bbq-chicken', name: 'BBQ Chicken', ingredients: ['8 Chicken Thighs', 'BBQ Sauce', 'BBQ Rub', 'Frozen Broccoli (or Green Beans)'], category: 'Dinner' },
  { id: 'chicken-quesadillas', name: 'Chicken Quesadillas', ingredients: ['Carb Friendly Tortillas (Large)', '2 Chicken Breast', 'Red Bell Pepper', 'Onion', 'Shredded Colby Jack Cheese', 'Salsa', 'Sour Cream/Greek Yogurt'], category: 'Dinner' },
  { id: 'turkey-meatballs', name: 'Turkey Meatballs', ingredients: ['Ground Turkey', 'Garlic', 'Egg', 'Italian Seasoned Bread Crumbs', 'Frozen Broccoli (or Green Beans)'], category: 'Dinner' },
  { id: 'vegetable-beef-soup', name: 'Vegetable Beef Soup', ingredients: ['Beef Broth', '2 Sirloin Steaks', 'Small Potatoes', 'Canned Diced Tomatoes', 'Tomato Sauce', 'Frozen Mixed Vegetables', 'Lentils'], category: 'Dinner' },
]

export const upcomingEvents = [
  { id: 1, title: 'Sprint planning', when: 'Mon 9:00 AM' },
  { id: 2, title: '1:1 check-in', when: 'Wed 2:00 PM' },
]

export const weeklyAverages = {
  week: { workoutsCompleted: '2/6', physical: 3.8, mental: 3.2, spiritual: 2.0, sleep: 2.8, stress: 3.6 },
  month: { workoutsCompleted: '11/24', physical: 3.6, mental: 3.4, spiritual: 3.1, sleep: 3.0, stress: 3.2 },
}
