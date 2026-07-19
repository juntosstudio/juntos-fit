import { supabase } from "../lib/supabase";
import { getProgramWeekRange, getTodayDateKey } from "../utils/dates";

const PLAN_FIELDS = `
  id,
  user_id,
  start_date,
  checkin_day,
  program_length_weeks,
  goal,
  status,
  end_date
`;

const TARGET_FIELDS = `
  id,
  coaching_plan_id,
  effective_date,
  calorie_target,
  protein_grams,
  carb_grams,
  fat_grams,
  weekly_cardio_target_minutes,
  daily_water_goal_oz
`;

// Writes useful details to the browser console during development only.
function debug(message, data = undefined) {
  if (import.meta.env.DEV) {
    console.debug(`[dashboardService] ${message}`, data ?? "");
  }
}

// Returns the target active today, or the first upcoming target.
async function loadCurrentTarget(coachingPlanId, today) {
  const { data: currentTarget, error: currentTargetError } = await supabase
    .from("coaching_plan_targets")
    .select(TARGET_FIELDS)
    .eq("coaching_plan_id", coachingPlanId)
    .lte("effective_date", today)
    .order("effective_date", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (currentTargetError) {
    throw currentTargetError;
  }

  if (currentTarget) {
    return currentTarget;
  }

  // Before the plan starts, show the earliest upcoming target.
  const { data: upcomingTarget, error: upcomingTargetError } = await supabase
    .from("coaching_plan_targets")
    .select(TARGET_FIELDS)
    .eq("coaching_plan_id", coachingPlanId)
    .order("effective_date", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (upcomingTargetError) {
    throw upcomingTargetError;
  }

  return upcomingTarget;
}

// Totals cardio completed inside the current fixed program week.
async function loadCardioCompleted(coachingPlanId, weekStart, weekEnd) {
  const { data: dailyCheckins, error } = await supabase
    .from("daily_checkins")
    .select("cardio_minutes")
    .eq("coaching_plan_id", coachingPlanId)
    .gte("checkin_date", weekStart)
    .lte("checkin_date", weekEnd);

  if (error) {
    throw error;
  }

  return (
    dailyCheckins?.reduce(
      (total, checkin) => total + (checkin.cardio_minutes ?? 0),
      0,
    ) ?? 0
  );
}

// Loads all information required by the home dashboard.
export async function loadDashboardData(userId) {
  const today = getTodayDateKey();

  debug("Loading dashboard.", {
    userId,
    today,
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", userId)
    .single();

  if (profileError) {
    throw profileError;
  }

  const { data: plan, error: planError } = await supabase
    .from("coaching_plans")
    .select(PLAN_FIELDS)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (planError) {
    throw planError;
  }

  if (!plan) {
    debug("No active coaching plan found.");

    return {
      profile,
      plan: null,
      target: null,
      cardioCompleted: 0,
      cardioWeekStart: null,
      cardioWeekEnd: null,
    };
  }

  const target = await loadCurrentTarget(plan.id, today);

  const { weekStart: cardioWeekStart, weekEnd: cardioWeekEnd } =
    getProgramWeekRange(plan.start_date, today);

  let cardioCompleted = 0;

  // Do not count check-ins before the coaching plan begins.
  if (today >= plan.start_date) {
    cardioCompleted = await loadCardioCompleted(
      plan.id,
      cardioWeekStart,
      cardioWeekEnd,
    );
  }

  const dashboard = {
    profile,
    plan,
    target,
    cardioCompleted,
    cardioWeekStart,
    cardioWeekEnd,
  };

  debug("Dashboard loaded successfully.", dashboard);

  return dashboard;
}
