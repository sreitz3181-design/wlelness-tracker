// Rough maintenance estimate from body weight alone (no height/age/sex
// stored yet, so this is a simplified 15 cal/lb activity-adjusted
// estimate rather than a full Mifflin-St Jeor calculation). Good enough
// for a starting target; revisit if more precise inputs get added later.
const CALORIES_PER_LB_MAINTENANCE = 15

// A 10 lb/month goal implies roughly a 1,150 cal/day deficit — above the
// commonly recommended safe range of 1-2 lb/week (~500-1,000 cal/day).
// Capping here on purpose: safer pace (~2 lb/week) rather than exactly
// matching the stated goal.
const SAFE_MAX_DAILY_DEFICIT = 1000
const SAFE_MIN_DAILY_CALORIES = 1500

// Same proportions as the original meal split (500/700/800/300 of 2300).
const MEAL_RATIOS = {
  breakfast: 500 / 2300,
  lunch: 700 / 2300,
  dinner: 800 / 2300,
  snacks: 300 / 2300,
}

export function computeCalorieTargets(weightLbs) {
  if (!weightLbs) return null
  const maintenance = Math.round(weightLbs * CALORIES_PER_LB_MAINTENANCE)
  const dailyTarget = Math.max(maintenance - SAFE_MAX_DAILY_DEFICIT, SAFE_MIN_DAILY_CALORIES)
  const deficit = maintenance - dailyTarget
  const meals = Object.fromEntries(
    Object.entries(MEAL_RATIOS).map(([key, ratio]) => [key, Math.round(dailyTarget * ratio)])
  )
  return { maintenance, dailyTarget, deficit, meals }
}
