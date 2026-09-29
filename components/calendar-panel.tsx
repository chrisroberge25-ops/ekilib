"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteConnection, importCalendar, logCalendarEvent, syncGoogleCalendar } from "@/lib/actions";
import { CATEGORIES, type Category } from "@/lib/categories";
import { errorText, type Dictionary } from "@/lib/i18n";
import type { ConnectionDTO, EventDTO } from "@/lib/queries";

export function CalendarPanel({
  dict,
  events,
  connections,
  googleReady,
  redirectUri,
  notice,
}: {
  dict: Dictionary;
  events: EventDTO[];
  connections: ConnectionDTO[];
  googleReady: boolean;
  redirectUri: string;
  notice?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState(notice || "");
  const google = connections.find((connection) => connection.provider === "google" && connection.status === "connected");

  async function onImport(formData: FormData) {
    const result = await importCalendar(formData);
    setMessage(result.ok ? dict.calendar.imported : errorText(dict, result.error));
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="panel p-5">
        <h2 className="display text-3xl text-indigo">{dict.calendar.google}</h2>
        <p className="mt-2 text-sm text-ink/75">{dict.calendar.googleBody}</p>
        {googleReady ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn btn-gold" href="/api/calendar/google/start">
              {dict.calendar.connect}
            </a>
            {google ? (
              <button
                type="button"
                className="btn btn-ink"
                onClick={async () => {
                  const result = await syncGoogleCalendar();
                  setMessage(result.ok ? dict.calendar.imported : errorText(dict, result.error));
                  if (result.ok) router.refresh();
                }}
              >
                {dict.calendar.sync}
              </button>
            ) : null}
            <p className="w-full text-sm text-ocean">{google ? dict.calendar.connected : dict.calendar.notConnected}</p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-cream p-4 text-sm">
            <p className="font-semibold text-indigo">{dict.calendar.setupTitle}</p>
            <p className="mt-2 text-ink/75">{dict.calendar.googleMissing}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5">
              {dict.calendar.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-3">
              {dict.calendar.redirect}: <code className="rounded bg-white px-2 py-1">{redirectUri}</code>
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {(
          [
            ["apple", dict.calendar.apple, dict.calendar.appleBody],
            ["outlook", dict.calendar.outlook, dict.calendar.outlookBody],
            ["ics", dict.calendar.ics, dict.calendar.icsBody],
          ] as const
        ).map(([provider, title, body]) => (
          <form key={provider} action={onImport} className="panel space-y-3 p-4">
            <h3 className="display text-2xl text-indigo">{title}</h3>
            <p className="text-sm text-ink/70">{body}</p>
            <input type="hidden" name="provider" value={provider} />
            <label className="block text-sm font-semibold">
              {dict.calendar.url}
              <input className="field mt-1" name="icsUrl" placeholder="https://" />
            </label>
            <label className="block text-sm font-semibold">
              {dict.calendar.paste}
              <textarea className="field mt-1 min-h-24" name="icsText" />
            </label>
            <button className="btn btn-ink" type="submit">
              {dict.calendar.import}
            </button>
          </form>
        ))}
      </div>

      {message ? <p className="text-sm text-ocean">{message}</p> : null}

      <section className="panel p-5">
        <h2 className="display text-2xl text-indigo">{dict.dash.events}</h2>
        <p className="mt-1 text-sm text-ink/60">{dict.calendar.demoNote}</p>
        {events.length === 0 ? <p className="mt-3 text-sm">{dict.dash.noEvents}</p> : null}
        <ul className="mt-3 space-y-3">
          {events.map((event) => (
            <EventRow key={event.id} event={event} dict={dict} />
          ))}
        </ul>
      </section>

      {connections.length > 0 ? (
        <ul className="space-y-2">
          {connections.map((connection) => (
            <li key={connection.id} className="flex items-center justify-between rounded-2xl bg-foam px-3 py-2 text-sm">
              <span>
                {connection.label || connection.provider} · {connection.status}
                {connection.lastError ? ` · ${connection.lastError}` : ""}
              </span>
              {connection.provider !== "demo" ? (
                <button
                  type="button"
                  className="text-coral"
                  onClick={async () => {
                    await deleteConnection(connection.id);
                    router.refresh();
                  }}
                >
                  {dict.calendar.remove}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function EventRow({ event, dict }: { event: EventDTO; dict: Dictionary }) {
  const router = useRouter();
  const [hours, setHours] = useState(event.hours || 1);
  const [category, setCategory] = useState<Category>((CATEGORIES as readonly string[]).includes(event.category) ? (event.category as Category) : "work");
  const [error, setError] = useState("");

  return (
    <li className="rounded-2xl bg-cream px-3 py-3">
      <p className="font-semibold text-indigo">{event.title}</p>
      <p className="text-sm text-ink/70">
        {event.allDay ? "ICS" : `${event.hours} ${dict.common.hoursShort}`}
        {event.category ? ` · ${dict.cats[category] ?? event.category}` : ""}
      </p>
      {event.logged ? (
        <p className="mt-2 text-sm text-ocean">{dict.calendar.logged}</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold">
            {dict.log.category}
            <select className="field mt-1" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {dict.cats[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold">
            {dict.calendar.hours}
            <input className="field mt-1 w-24" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </label>
          <button
            type="button"
            className="btn btn-gold"
            onClick={async () => {
              const result = await logCalendarEvent(event.id, hours, category);
              if (!result.ok) setError(errorText(dict, result.error));
              else router.refresh();
            }}
          >
            {dict.calendar.toLog}
          </button>
          {error ? <p className="text-sm text-coral">{error}</p> : null}
        </div>
      )}
    </li>
  );
}
