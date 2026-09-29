import { LogList } from "@/components/day-widgets";
import { LogComposer } from "@/components/log-composer";
import { requireUser } from "@/lib/auth";
import { dictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/locale";
import { loadDashboard } from "@/lib/queries";

export default async function LogPage() {
  const user = await requireUser();
  const locale = isLocale(user.locale) ? user.locale : "ht";
  const dict = dictionary(locale);
  const data = await loadDashboard(user.id, user.timezone, user.voiceId);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="display text-4xl text-indigo">{dict.log.title}</h1>
      <LogComposer dict={dict} date={data.today} />
      <LogList logs={data.todayLogs} dict={dict} />
    </div>
  );
}
