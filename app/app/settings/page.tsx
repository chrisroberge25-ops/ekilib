import { SettingsPanel } from "@/components/settings-panel";
import { requireUser } from "@/lib/auth";
import { integrationStatus } from "@/lib/integrations";
import { dictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/locale";

export default async function SettingsPage() {
  const user = await requireUser();
  const locale = isLocale(user.locale) ? user.locale : "ht";
  return (
    <SettingsPanel
      dict={dictionary(locale)}
      locale={locale}
      user={{ name: user.name, timezone: user.timezone, voiceId: user.voiceId, plan: user.plan }}
      integrations={integrationStatus(user.voiceId)}
    />
  );
}
