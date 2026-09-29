export type Locale = "ht" | "fr" | "en";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "ht" || value === "fr" || value === "en";
}
