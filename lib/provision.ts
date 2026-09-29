import { CATEGORIES, DEFAULT_GOALS } from "./categories";
import { prisma } from "./db";

export const BUILTIN_HABITS = [
  { key: "pray", name: "Priye oswa medite" },
  { key: "water", name: "Bwè dlo" },
  { key: "move", name: "Mache oswa fè espò" },
  { key: "family", name: "Pale ak fanmi" },
  { key: "sleep", name: "Kouche a lè" },
] as const;

export async function provisionUser(userId: string) {
  const goals = await prisma.categoryGoal.count({ where: { userId } });
  if (goals === 0) {
    await prisma.categoryGoal.createMany({
      data: CATEGORIES.map((slug, sortOrder) => ({
        userId,
        slug,
        goalHours: DEFAULT_GOALS[slug],
        sortOrder,
      })),
    });
  }
  const habits = await prisma.habit.count({ where: { userId } });
  if (habits === 0) {
    await prisma.habit.createMany({
      data: BUILTIN_HABITS.map((habit, sortOrder) => ({
        userId,
        key: habit.key,
        name: habit.name,
        sortOrder,
      })),
    });
  }
}
