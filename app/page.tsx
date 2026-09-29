import { Landing } from "@/components/landing";
import { dictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";

export default async function HomePage() {
  const locale = await getRequestLocale();
  return <Landing dict={dictionary(locale)} locale={locale} />;
}
