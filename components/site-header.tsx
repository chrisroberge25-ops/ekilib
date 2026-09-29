import Link from "next/link";
import { LocaleToggle } from "./locale-toggle";
import { Mark } from "./icons";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";

export function SiteHeader({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5">
      <Link href="/" className="flex items-center gap-2 font-semibold text-indigo">
        <Mark className="h-9 w-9" />
        <span className="display text-xl">Ekilib</span>
      </Link>
      <div className="flex items-center gap-3">
        <LocaleToggle locale={locale} labels={dict.languages} />
        <Link href="/pricing" className="hidden text-sm font-semibold text-indigo/80 sm:inline">
          {dict.nav.pricing}
        </Link>
        <Link href="/login" className="text-sm font-semibold text-indigo">
          {dict.nav.login}
        </Link>
      </div>
    </header>
  );
}
