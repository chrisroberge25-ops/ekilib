import { cookies } from "next/headers";
import { isLocale, type Locale } from "./locale";

export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  const value = jar.get("ekilib_locale")?.value;
  return isLocale(value) ? value : "ht";
}
