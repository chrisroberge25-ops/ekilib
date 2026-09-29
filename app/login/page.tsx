import { LoginForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";
import { dictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; demo?: string }>;
}) {
  const params = await searchParams;
  const locale = await getRequestLocale();
  const dict = dictionary(locale);
  const nextPath = params.next?.startsWith("/") ? params.next : "/app";
  return (
    <div>
      <SiteHeader dict={dict} locale={locale} />
      <main className="mx-auto flex max-w-6xl justify-center px-5 py-10">
        <LoginForm dict={dict} nextPath={nextPath} demo={params.demo === "1"} />
      </main>
    </div>
  );
}
