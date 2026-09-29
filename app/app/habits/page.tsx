import { HabitBoard } from "@/components/day-widgets";
import { requireUser } from "@/lib/auth";
import { dictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/locale";
import { loadDashboard } from "@/lib/queries";

export default async function HabitsPage() {
  const user = await requireUser();
  const locale = isLocale(user.locale) ? user.locale : "ht";
  const dict = dictionary(locale);
  const data = await loadDashboard(user.id, user.timezone, user.voiceId);
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="display mb-4 text-4xl text-indigo">{dict.habits.title}</h1>
      <HabitBoard habits={data.habits} date={data.today} dict={dict} />
    </div>
  );
}
