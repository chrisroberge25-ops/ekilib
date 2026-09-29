import { CATEGORIES, type Category, emptyHours } from "./categories";
import { roundQuarter } from "./dates";

export function sumHours(hours: Record<Category, number>): number {
  return CATEGORIES.reduce((total, category) => total + hours[category], 0);
}

export function balanceScore(
  actual: Record<Category, number>,
  goals: Record<Category, number>,
): number {
  const actualTotal = sumHours(actual);
  const goalTotal = sumHours(goals);
  if (actualTotal <= 0 || goalTotal <= 0) return 0;
  const drift = CATEGORIES.reduce((total, category) => {
    return total + Math.abs(actual[category] / actualTotal - goals[category] / goalTotal);
  }, 0);
  return Math.max(0, Math.min(100, Math.round((1 - drift / 2) * 100)));
}

export function untrackedHours(input: {
  tracked: number;
  date: string;
  today: string;
  nowHours: number;
}): number {
  if (input.date > input.today) return 0;
  if (input.date < input.today) return Math.max(0, roundQuarter(24 - input.tracked));
  return Math.max(0, roundQuarter(input.nowHours - input.tracked));
}

export function tally(
  logs: { category: string; hours: number; date: string }[],
  dates: string[],
): Record<Category, number> {
  const totals = emptyHours();
  const allowed = new Set(dates);
  for (const log of logs) {
    if (!allowed.has(log.date)) continue;
    if (log.category in totals) {
      totals[log.category as Category] += log.hours;
    }
  }
  return totals;
}

export type InsightId =
  | "empty"
  | "strong"
  | "workHeavySleepLight"
  | "noHealth"
  | "noLife"
  | "sleepShort"
  | "steady";

export function pickInsight(input: {
  today: Record<Category, number>;
  week: Record<Category, number>;
  goals: Record<Category, number>;
  score: number;
}): InsightId {
  const todayTotal = sumHours(input.today);
  const weekTotal = sumHours(input.week);
  if (todayTotal === 0 && weekTotal === 0) return "empty";
  if (input.week.health < 0.5 && weekTotal > 4) return "noHealth";
  if (input.week.life < 1 && weekTotal > 6) return "noLife";
  if (input.today.work > input.goals.work * 1.15 && input.today.sleep < input.goals.sleep * 0.75 && input.today.sleep > 0) {
    return "workHeavySleepLight";
  }
  if (input.today.sleep > 0 && input.today.sleep < input.goals.sleep * 0.7) return "sleepShort";
  if (input.score >= 78 && todayTotal > 0) return "strong";
  return "steady";
}
