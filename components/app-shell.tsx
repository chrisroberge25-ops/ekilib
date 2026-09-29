"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";
import { LocaleToggle } from "./locale-toggle";
import { Mark } from "./icons";

const LINKS = [
  { href: "/app", key: "today" },
  { href: "/app/log", key: "log" },
  { href: "/app/chat", key: "chat" },
  { href: "/app/calendar", key: "calendar" },
  { href: "/app/insights", key: "insights" },
  { href: "/app/habits", key: "habits" },
] as const;

export function AppShell({
  children,
  dict,
  locale,
  user,
}: {
  children: React.ReactNode;
  dict: Dictionary;
  locale: Locale;
  user: { name: string; email: string; plan: string };
}) {
  const pathname = usePathname();
  const plan = user.plan === "PRO" ? dict.plan.pro : dict.plan.free;

  function active(href: string) {
    return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden bg-indigo text-cream md:flex md:flex-col md:justify-between md:px-4 md:py-6">
        <div>
          <Link href="/app" className="flex items-center gap-2 px-2">
            <Mark />
            <span className="display text-2xl">Ekilib</span>
          </Link>
          <nav className="mt-8 space-y-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-2xl px-3 py-2 text-sm font-semibold ${active(link.href) ? "bg-white/10 text-gold" : "text-cream/80"}`}
              >
                {dict.nav[link.key]}
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-3 px-2 text-sm">
          <Link href="/app/settings" className="block font-semibold text-cream/80">
            {dict.nav.settings}
          </Link>
          <p className="text-cream/70">{user.name}</p>
          <p className="text-gold">{plan}</p>
          <form action={logoutAction}>
            <button className="text-cream/80" type="submit">
              {dict.nav.logout}
            </button>
          </form>
        </div>
      </aside>
      <div>
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-8">
          <Link href="/app" className="flex items-center gap-2 md:hidden">
            <Mark className="h-8 w-8" />
            <span className="display text-xl text-indigo">Ekilib</span>
          </Link>
          <p className="hidden text-sm text-ink/60 md:block">{user.email}</p>
          <div className="flex items-center gap-3">
            <LocaleToggle locale={locale} labels={dict.languages} mode="account" />
            <Link href="/app/settings" className="text-sm font-semibold text-ocean md:hidden">
              {dict.nav.settings}
            </Link>
          </div>
        </header>
        <main className="px-4 py-6 pb-24 md:px-8 md:pb-10">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-foam/95 px-1 py-2 backdrop-blur md:hidden">
        {LINKS.slice(0, 5).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl px-1 py-2 text-center text-[11px] font-semibold ${active(link.href) ? "text-ocean" : "text-ink/60"}`}
          >
            {dict.nav[link.key]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
