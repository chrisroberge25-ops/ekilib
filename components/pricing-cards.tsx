"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { setPlan } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n";

export function PricingCards({ dict, plan }: { dict: Dictionary; plan: string | null }) {
  const router = useRouter();
  const cards = [
    { id: "FREE" as const, name: dict.pricing.free, price: dict.pricing.freePrice, items: dict.pricing.freeItems, label: dict.pricing.chooseFree },
    { id: "PRO" as const, name: dict.pricing.pro, price: dict.pricing.proPrice, items: dict.pricing.proItems, label: dict.pricing.choosePro },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <article key={card.id} className={`panel p-6 ${card.id === "PRO" ? "ring-2 ring-gold" : ""}`}>
          <p className="text-sm font-semibold text-ocean">{card.name}</p>
          <p className="display mt-2 text-5xl text-indigo">
            {card.price}
            <span className="ml-1 text-lg text-ink/50">{dict.pricing.per}</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {card.items.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
          {plan ? (
            <button
              type="button"
              className="btn btn-gold mt-6"
              onClick={async () => {
                await setPlan(card.id);
                router.refresh();
              }}
            >
              {plan === card.id ? dict.pricing.current : card.label}
            </button>
          ) : (
            <Link href="/signup" className="btn btn-gold mt-6">
              {dict.pricing.signup}
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}
