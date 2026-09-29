import { AppShell } from "@/components/app-shell";
import { OfflineBanner } from "@/components/offline-banner";
import { requireUser } from "@/lib/auth";
import { dictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/locale";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const locale = isLocale(user.locale) ? user.locale : "ht";
  const dict = dictionary(locale);
  return (
    <AppShell dict={dict} locale={locale} user={{ name: user.name, email: user.email, plan: user.plan }}>
      <OfflineBanner dict={dict} />
      {children}
    </AppShell>
  );
}
