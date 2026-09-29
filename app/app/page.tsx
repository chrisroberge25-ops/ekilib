import { ChatPanel } from "@/components/chat-panel";
import { HabitBoard, LogList, ReflectionForm } from "@/components/day-widgets";
import { LogComposer } from "@/components/log-composer";
import { ScoreCard } from "@/components/score-card";
import { requireUser } from "@/lib/auth";
import { formatPretty } from "@/lib/dates";
import { dictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/locale";
import { loadDashboard, loadMessages } from "@/lib/queries";

export default async function DashboardPage() {
  const user = await requireUser();
  const locale = isLocale(user.locale) ? user.locale : "ht";
  const dict = dictionary(locale);
  const [data, messages] = await Promise.all([
    loadDashboard(user.id, user.timezone, user.voiceId),
    loadMessages(user.id),
  ]);
  const hello = data.nowHours < 17 ? dict.dash.morning : dict.dash.evening;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-ocean">{formatPretty(data.today, locale)}</p>
          <h1 className="display text-4xl text-indigo">
            {hello}, {user.name.split(" ")[0]}
          </h1>
        </header>
        <LogComposer dict={dict} date={data.today} />
        <LogList logs={data.todayLogs} dict={dict} />
        <div className="grid gap-6 lg:grid-cols-2">
          <HabitBoard habits={data.habits} date={data.today} dict={dict} />
          <ReflectionForm dict={dict} date={data.today} initial={data.reflection} />
        </div>
      </div>
      <div className="space-y-6">
        <ScoreCard data={data} dict={dict} />
        <section className="panel p-5">
          <h2 className="display text-2xl text-indigo">{dict.dash.events}</h2>
          {data.events.length === 0 ? <p className="mt-2 text-sm text-ink/60">{dict.dash.noEvents}</p> : null}
          <ul className="mt-3 space-y-2 text-sm">
            {data.events.map((event) => (
              <li key={event.id} className="rounded-2xl bg-cream px-3 py-2">
                <p className="font-semibold">{event.title}</p>
                <p className="text-ink/60">{event.logged ? dict.calendar.logged : dict.calendar.toLog}</p>
              </li>
            ))}
          </ul>
        </section>
        <ChatPanel dict={dict} locale={locale} date={data.today} initial={messages} compact />
      </div>
    </div>
  );
}
