import { SignupForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";
import { dictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";

export default async function SignupPage() {
  const locale = await getRequestLocale();
  const dict = dictionary(locale);
  return (
    <div>
      <SiteHeader dict={dict} locale={locale} />
      <main className="mx-auto flex max-w-6xl justify-center px-5 py-10">
        <SignupForm dict={dict} locale={locale} />
      </main>
    </div>
  );
}
