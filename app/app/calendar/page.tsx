import { CalendarPanel } from "@/components/calendar-panel";
import { requireUser } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";
import { errorText, dictionary } from "@/lib/i18n";
import { googleRedirectUri } from "@/lib/integrations";
import { isLocale } from "@/lib/locale";
import { loadDashboard } from "@/lib/queries";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; setup?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const locale = isLocale(user.locale) ? user.locale : "ht";
  const dict = dictionary(locale);
  const data = await loadDashboard(user.id, user.timezone, user.voiceId);
  const notice = params.connected
    ? dict.calendar.connected
    : params.setup
      ? dict.calendar.googleMissing
      : params.error
        ? errorText(dict, params.error === "state" ? "auth" : "sync")
        : "";

  return (
    <div className="space-y-4">
      <header>
        <h1 className="display text-4xl text-indigo">{dict.calendar.title}</h1>
        <p className="mt-2 max-w-2xl text-ink/75">{dict.calendar.intro}</p>
      </header>
      <CalendarPanel
        dict={dict}
        events={data.events}
        connections={data.connections}
        googleReady={googleConfigured()}
        redirectUri={googleRedirectUri()}
        notice={notice}
      />
    </div>
  );
}
