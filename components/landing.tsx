import Link from "next/link";
import { demoLoginAction } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n";
import { BalanceRing } from "./balance-ring";
import { RhythmIcon, SunIcon } from "./icons";
import { SiteHeader } from "./site-header";
import type { Locale } from "@/lib/locale";

export function Landing({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const copy = dict.landing;
  return (
    <div>
      <SiteHeader dict={dict} locale={locale} />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-foam px-3 py-1 text-sm text-ocean">
              <SunIcon className="h-4 w-4" />
              {copy.kicker}
            </p>
            <h1 className="display max-w-xl text-5xl leading-[1.05] text-indigo sm:text-6xl">{copy.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/80">{copy.lede}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <form action={demoLoginAction}>
                <button className="btn btn-gold" type="submit">
                  {copy.demo}
                </button>
              </form>
              <Link href="/signup" className="btn btn-ink">
                {copy.signup}
              </Link>
              <Link href="/pricing" className="btn btn-ghost border-indigo/20 text-indigo">
                {copy.pricing}
              </Link>
            </div>
          </div>
          <div className="hero-wash relative overflow-hidden rounded-[2rem] p-8 text-cream shadow-xl">
            <RhythmIcon className="mb-6 h-8 w-24 text-gold" />
            <BalanceRing
              score={76}
              label={dict.dash.score}
              parts={[
                { color: "#7eb6d4", value: 6 },
                { color: "#d4a054", value: 3 },
                { color: "#e07a62", value: 1.5 },
                { color: "#d7e4ee", value: 7 },
              ]}
            />
            <p className="mt-4 max-w-xs text-sm text-cream/80">{copy.ringCaption}</p>
            <ul className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {(["work", "life", "health", "sleep"] as const).map((slug) => (
                <li key={slug} className="rounded-2xl bg-white/10 px-3 py-2">
                  {dict.cats[slug]}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-8">
          <h2 className="display text-3xl text-indigo">{copy.pillarTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.pillars.map((pillar, index) => (
              <article key={pillar.title} className="panel p-5">
                <p className="text-sm font-semibold text-gold-deep">0{index + 1}</p>
                <h3 className="display mt-2 text-2xl text-indigo">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">{pillar.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 lg:grid-cols-3">
          <article className="panel p-6 lg:col-span-1">
            <h2 className="display text-3xl text-indigo">{copy.stepsTitle}</h2>
            <ol className="mt-5 space-y-4">
              {copy.steps.map((step) => (
                <li key={step.title}>
                  <p className="font-semibold text-ocean">{step.title}</p>
                  <p className="text-sm text-ink/75">{step.body}</p>
                </li>
              ))}
            </ol>
          </article>
          <article className="panel p-6">
            <h2 className="display text-3xl text-indigo">{copy.voiceTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{copy.voiceBody}</p>
            <p className="mt-6 rounded-2xl bg-indigo px-4 py-3 text-cream">« Mwen travay 3 èdtan »</p>
          </article>
          <article className="panel p-6">
            <h2 className="display text-3xl text-indigo">{copy.counselTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{copy.counselBody}</p>
            <p className="mt-4 text-sm font-semibold text-coral">{copy.counselNote}</p>
          </article>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-6">
          <div className="rounded-[2rem] bg-ocean px-6 py-8 text-cream sm:px-10">
            <h2 className="display text-3xl">{copy.calendarTitle}</h2>
            <p className="mt-3 max-w-2xl text-cream/85">{copy.calendarBody}</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display text-4xl text-indigo">{copy.ctaTitle}</h2>
              <p className="mt-2 max-w-xl text-ink/75">{copy.ctaBody}</p>
            </div>
            <form action={demoLoginAction}>
              <button className="btn btn-gold" type="submit">
                {copy.demo}
              </button>
            </form>
          </div>
        </section>
      </main>
      <footer className="border-t border-line px-5 py-8 text-sm text-ink/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p>{copy.footer}</p>
          <div className="flex gap-4">
            <Link href="/pricing">{dict.nav.pricing}</Link>
            <Link href="/login">{dict.nav.login}</Link>
            <Link href="/signup">{dict.nav.signup}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
