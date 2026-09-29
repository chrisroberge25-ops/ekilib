import { PricingCards } from "@/components/pricing-cards";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { dictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";

export default async function PricingPage() {
  const locale = await getRequestLocale();
  const dict = dictionary(locale);
  const user = await getCurrentUser();
  return (
    <div>
      <SiteHeader dict={dict} locale={locale} />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="display text-5xl text-indigo">{dict.pricing.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink/75">{dict.pricing.lede}</p>
        <div className="mt-8">
          <PricingCards dict={dict} plan={user?.plan ?? null} />
        </div>
      </main>
    </div>
  );
}
