import { CATEGORY_COLORS, CATEGORIES } from "@/lib/categories";
import { formatHours } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n";
import type { DashboardDTO } from "@/lib/queries";
import { BalanceRing } from "./balance-ring";
import { CategoryMeters } from "./day-widgets";

export function ScoreCard({ data, dict }: { data: DashboardDTO; dict: Dictionary }) {
  return (
    <section className="hero-wash rounded-[1.5rem] p-5 text-cream">
      <div className="flex items-center justify-between gap-3">
        <BalanceRing
          score={data.score}
          label={dict.dash.score}
          parts={CATEGORIES.map((category) => ({
            color: category === "work" ? "#8ec3dc" : CATEGORY_COLORS[category],
            value: data.todayByCat[category],
          }))}
        />
        <div className="text-sm">
          <p className="text-cream/70">{dict.dash.untracked}</p>
          <p className="display text-3xl">
            {formatHours(data.untracked)} {dict.common.hoursShort}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-white/10 p-3 text-sm leading-relaxed">{dict.lines[data.insight]}</div>
      <div className="mt-4 text-ink">
        <div className="rounded-2xl bg-foam p-3">
          <CategoryMeters dict={dict} actual={data.todayByCat} goals={data.goals} />
        </div>
      </div>
    </section>
  );
}
