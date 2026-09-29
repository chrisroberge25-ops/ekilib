"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateGoals } from "@/lib/actions";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import { formatHours, weekdayShort } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";
import type { LogDTO } from "@/lib/queries";
import { CategoryMeters } from "./day-widgets";

export function InsightsPanel({
  dict,
  locale,
  dates,
  logs,
  goals,
  todayByCat,
  score,
}: {
  dict: Dictionary;
  locale: Locale;
  dates: string[];
  logs: LogDTO[];
  goals: Record<Category, number>;
  todayByCat: Record<Category, number>;
  score: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(goals);
  const [saved, setSaved] = useState(false);
  const totals = dates.map((date) =>
    CATEGORIES.map((category) => logs.filter((log) => log.date === date && log.category === category).reduce((sum, log) => sum + log.hours, 0)),
  );
  const max = Math.max(8, ...totals.map((day) => day.reduce((sum, hours) => sum + hours, 0)));

  return (
    <div className="space-y-6">
      <section className="panel p-5">
        <div className="flex items-end justify-between">
          <h2 className="display text-3xl text-indigo">{dict.insights.week}</h2>
          <p className="text-sm text-ocean">
            {dict.insights.score}: {score}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-7 gap-2">
          {dates.map((date, index) => {
            const parts = totals[index] ?? [];
            const total = parts.reduce((sum, hours) => sum + hours, 0);
            return (
              <div key={date} className="flex h-44 flex-col justify-end">
                <div className="flex flex-col-reverse overflow-hidden rounded-t-xl bg-cream" style={{ height: `${Math.max(6, (total / max) * 100)}%` }}>
                  {CATEGORIES.map((category, categoryIndex) => (
                    <div
                      key={category}
                      style={{
                        height: total ? `${((parts[categoryIndex] ?? 0) / total) * 100}%` : 0,
                        background: CATEGORY_COLORS[category],
                      }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-ink/60">{weekdayShort(date, locale)}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          {CATEGORIES.map((category) => (
            <span key={category} className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[category] }} />
              {dict.cats[category]}
            </span>
          ))}
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="display text-2xl text-indigo">{dict.dash.goals}</h2>
        <div className="mt-4">
          <CategoryMeters dict={dict} actual={todayByCat} goals={goals} />
        </div>
      </section>
      <form
        className="panel space-y-3 p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await updateGoals(CATEGORIES.map((slug) => ({ slug, goalHours: Number(draft[slug]) })));
          if (result.ok) {
            setSaved(true);
            router.refresh();
          }
        }}
      >
        <h2 className="display text-2xl text-indigo">{dict.insights.goals}</h2>
        <p className="text-sm text-ink/70">{dict.insights.goalHint}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((category) => (
            <label key={category} className="text-sm font-semibold">
              {dict.cats[category]}
              <input
                className="field mt-1"
                inputMode="decimal"
                value={draft[category]}
                onChange={(event) => setDraft({ ...draft, [category]: Number(event.target.value) })}
              />
            </label>
          ))}
        </div>
        <p className="text-sm text-ink/60">
          {formatHours(CATEGORIES.reduce((sum, category) => sum + (Number(draft[category]) || 0), 0))} {dict.common.hoursShort}
        </p>
        <button className="btn btn-gold" type="submit">
          {dict.insights.saveGoals}
        </button>
        {saved ? <p className="text-sm text-ocean">{dict.dash.saved}</p> : null}
      </form>
    </div>
  );
}
