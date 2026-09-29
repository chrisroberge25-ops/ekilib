import { isCategory, type Category } from "./categories";

export type ParseConfidence = "high" | "low";

export type ParsedLog = {
  category: Category | null;
  hours: number | null;
  note: string;
  confidence: ParseConfidence;
  raw: string;
};

const NUMBER_WORDS: Record<string, number> = {
  yon: 1,
  youn: 1,
  en: 1,
  un: 1,
  une: 1,
  one: 1,
  de: 2,
  deux: 2,
  two: 2,
  twa: 3,
  trois: 3,
  three: 3,
  kat: 4,
  quatre: 4,
  four: 4,
  senk: 5,
  cinq: 5,
  five: 5,
  sis: 6,
  six: 6,
  set: 7,
  sept: 7,
  seven: 7,
  uit: 8,
  eight: 8,
  nef: 9,
  neuf: 9,
  nine: 9,
  dis: 10,
  dix: 10,
  ten: 10,
  demi: 0.5,
  half: 0.5,
};

const KEYWORDS: Record<Category, string[]> = {
  work: [
    "travay",
    "biznis",
    "reinyon",
    "reyinyon",
    "reunion",
    "imel",
    "kliyan",
    "pwoje",
    "lekol",
    "etid",
    "ofis",
    "job",
    "work",
    "worked",
    "working",
    "meeting",
    "bureau",
    "travail",
    "travaille",
    "travailler",
    "client",
    "kod",
  ],
  life: [
    "fanmi",
    "zanmi",
    "legliz",
    "priye",
    "timoun",
    "lakay",
    "family",
    "famille",
    "amis",
    "ami",
    "social",
    "priere",
    "eglise",
    "friend",
    "friends",
  ],
  health: [
    "espo",
    "sport",
    "jim",
    "gym",
    "kouri",
    "yoga",
    "medite",
    "meditasyon",
    "sante",
    "health",
    "mache",
    "marche",
    "exercice",
    "exercise",
    "workout",
    "dlo",
    "manje",
  ],
  sleep: ["domi", "kabann", "siesta", "nap", "sleep", "slept", "dormir", "dodo", "sommeil"],
};

const PREFIX: Record<string, Category> = {
  t: "work",
  w: "work",
  l: "life",
  s: "health",
  d: "sleep",
};

export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/’/g, "'");
}

function parseDuration(folded: string): number | null {
  const minuteMatch = folded.match(
    /(\d+(?:[.,]\d+)?)\s*(minit|min|minutes|minute|mins)\b/,
  );
  const hourUnit = "edtan|zedtan|heures|heure|hours|hour|hrs|hr|h|e";
  const hourNumber = folded.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${hourUnit})\\b`));
  const hourWord = folded.match(
    new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\s*(${hourUnit})\\b`),
  );
  const demi = folded.match(/\b(demi|half)\s*(edtan|heure|hour|h|e)\b/);

  if (/\binedtan\b/.test(folded)) return 1;
  if (hourNumber) return clampHours(Number(hourNumber[1].replace(",", ".")));
  if (hourWord) return clampHours(NUMBER_WORDS[hourWord[1]]);
  if (demi) return 0.5;
  if (minuteMatch) return clampHours(Number(minuteMatch[1].replace(",", ".")) / 60);
  return null;
}

function clampHours(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(Math.min(value, 24) * 100) / 100;
}

function categoryFromPrefix(raw: string): Category | null {
  const match = raw.trim().match(/^([A-Za-z])\s*[:：-]\s*/);
  if (!match) return null;
  return PREFIX[match[1].toLowerCase()] ?? null;
}

function categoryFromKeywords(folded: string): Category | null {
  let best: Category | null = null;
  let bestScore = 0;
  for (const category of Object.keys(KEYWORDS) as Category[]) {
    let score = 0;
    for (const word of KEYWORDS[category]) {
      const pattern = new RegExp(`(?:^|[^a-z])${word}(?:[^a-z]|$)`);
      if (pattern.test(folded)) score += word.length > 4 ? 2 : 1;
    }
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return best;
}

export function parseUtterance(raw: string): ParsedLog {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  const folded = fold(trimmed);
  const prefix = categoryFromPrefix(trimmed);
  const keyword = categoryFromKeywords(folded);
  const category = prefix ?? keyword;
  const hours = parseDuration(folded);
  const confidence: ParseConfidence = category && hours ? "high" : "low";
  return {
    category,
    hours,
    note: trimmed,
    confidence,
    raw: trimmed,
  };
}

export function coerceParsed(input: {
  category?: string | null;
  hours?: number | null;
  note?: string | null;
}): { category: Category; hours: number; note: string } | null {
  if (!input.category || !isCategory(input.category)) return null;
  if (input.hours == null || !Number.isFinite(input.hours)) return null;
  const hours = clampHours(input.hours);
  if (!hours) return null;
  return {
    category: input.category,
    hours,
    note: (input.note ?? "").trim().slice(0, 280),
  };
}
