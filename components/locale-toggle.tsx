"use client";

import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";

export function LocaleToggle({
  locale,
  labels,
  mode = "cookie",
  tone = "light",
}: {
  locale: Locale;
  labels: Dictionary["languages"];
  mode?: "cookie" | "account";
  tone?: "light" | "dark";
}) {
  const router = useRouter();

  async function choose(next: Locale) {
    if (next === locale) return;
    if (mode === "account") {
      await setLocale(next);
    } else {
      document.cookie = `ekilib_locale=${next};path=/;max-age=31536000;samesite=lax`;
    }
    router.refresh();
  }

  const active = tone === "dark" ? "bg-cream text-indigo" : "bg-indigo text-cream";
  const idle = tone === "dark" ? "text-cream/80" : "text-indigo/70";

  return (
    <div className={`inline-flex rounded-full p-1 ${tone === "dark" ? "bg-white/10" : "bg-indigo/5"}`} role="group" aria-label="Language">
      {(["ht", "fr", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          className={`rounded-full px-3 py-1 text-sm font-semibold ${locale === code ? active : idle}`}
          aria-pressed={locale === code}
        >
          {labels[code]}
        </button>
      ))}
    </div>
  );
}
