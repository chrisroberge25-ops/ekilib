export const CATEGORIES = ["work", "life", "health", "sleep"] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<Category, string> = {
  work: "#1a5278",
  life: "#d4a054",
  health: "#e07a62",
  sleep: "#3e6d8c",
};

export const DEFAULT_GOALS: Record<Category, number> = {
  work: 8,
  life: 4,
  health: 1.5,
  sleep: 7.5,
};

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function emptyHours(): Record<Category, number> {
  return { work: 0, life: 0, health: 0, sleep: 0 };
}
