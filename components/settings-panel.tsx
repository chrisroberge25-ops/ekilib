"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPlan, updateSettings } from "@/lib/actions";
import { errorText, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";
import type { IntegrationStatus } from "@/lib/integrations";

export function SettingsPanel({
  dict,
  locale,
  user,
  integrations,
}: {
  dict: Dictionary;
  locale: Locale;
  user: { name: string; timezone: string; voiceId: string; plan: string };
  integrations: IntegrationStatus;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const rows = [
    [dict.settings.openai, integrations.openai],
    [dict.settings.eleven, integrations.eleven],
    [dict.settings.voiceState, integrations.voice],
    [dict.settings.google, integrations.google],
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        className="panel space-y-4 p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await updateSettings(new FormData(event.currentTarget));
          setMessage(result.ok ? dict.dash.saved : errorText(dict, result.error));
          if (result.ok) router.refresh();
        }}
      >
        <h1 className="display text-3xl text-indigo">{dict.settings.title}</h1>
        <label className="block text-sm font-semibold">
          {dict.auth.name}
          <input className="field mt-1" name="name" defaultValue={user.name} />
        </label>
        <label className="block text-sm font-semibold">
          {dict.settings.language}
          <select className="field mt-1" name="locale" defaultValue={locale}>
            <option value="ht">Kreyòl</option>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {dict.settings.timezone}
          <input className="field mt-1" name="timezone" defaultValue={user.timezone} />
        </label>
        <label className="block text-sm font-semibold">
          {dict.settings.voice}
          <input className="field mt-1" name="voiceId" defaultValue={user.voiceId} autoComplete="off" />
        </label>
        <p className="text-sm text-ink/70">{dict.settings.voiceHelp}</p>
        <button className="btn btn-gold" type="submit">
          {dict.settings.save}
        </button>
        {message ? <p className="text-sm text-ocean">{message}</p> : null}
      </form>
      <div className="space-y-4">
        <section className="panel p-5">
          <h2 className="display text-2xl text-indigo">{dict.settings.integrations}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {rows.map(([label, on]) => (
              <li key={label} className="flex justify-between rounded-2xl bg-cream px-3 py-2">
                <span>{label}</span>
                <span className={on ? "text-ocean" : "text-coral"}>{on ? dict.settings.on : dict.settings.off}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel p-5">
          <h2 className="display text-2xl text-indigo">{dict.settings.plan}</h2>
          <p className="mt-1 text-sm">{user.plan === "PRO" ? dict.plan.pro : dict.plan.free}</p>
          <p className="mt-2 text-sm text-ink/70">{dict.plan.stub}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn btn-gold"
              onClick={async () => {
                await setPlan("PRO");
                router.refresh();
              }}
            >
              {dict.settings.upgrade}
            </button>
            <button
              type="button"
              className="btn btn-ghost border-indigo/20"
              onClick={async () => {
                await setPlan("FREE");
                router.refresh();
              }}
            >
              {dict.settings.downgrade}
            </button>
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="display text-2xl text-indigo">{dict.settings.offlineTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{dict.settings.offlineBody}</p>
        </section>
      </div>
    </div>
  );
}
