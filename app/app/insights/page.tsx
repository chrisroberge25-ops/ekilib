import { InsightsPanel } from "@/components/insights-panel";
import { requireUser } from "@/lib/auth";
import { dictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/locale";
import { loadDashboard } from "@/lib/queries";

export default async function InsightsPage() {
  const user = await requireUser();
  const locale = isLocale(user.locale) ? user.locale : "ht";
  const dict = dictionary(locale);
  const data = await loadDashboard(user.id, user.timezone, user.voiceId);
  return (
    <div className="space-y-4">
      <h1 className="display text-4xl text-indigo">{dict.insights.title}</h1>
      <p className="max-w-2xl text-ink/75">{dict.lines[data.insight]}</p>
      <InsightsPanel
        dict={dict}
        locale={locale}
        dates={data.weekDates}
        logs={data.weekLogs}
        goals={data.goals}
        todayByCat={data.todayByCat}
        score={data.score}
      />
    </div>
  );
}
