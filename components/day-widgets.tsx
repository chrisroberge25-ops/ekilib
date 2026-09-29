"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addHabit, deleteLog, saveReflection, toggleHabit } from "@/lib/actions";
import { CATEGORY_COLORS, type Category } from "@/lib/categories";
import { formatHours } from "@/lib/dates";
import { habitName, type Dictionary } from "@/lib/i18n";
import type { LogDTO } from "@/lib/queries";

export function LogList({ logs, dict }: { logs: LogDTO[]; dict: Dictionary }) {
  const router = useRouter();
  return (
    <section className="panel p-5">
      <h2 className="display text-2xl text-indigo">{dict.dash.todayLogs}</h2>
      {logs.length === 0 ? <p className="mt-3 text-sm text-ink/60">{dict.dash.emptyLogs}</p> : null}
      <ul className="mt-3 space-y-2">
        {logs.map((log) => (
          <li key={log.id} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-3 py-2">
            <div>
              <p className="font-semibold text-indigo">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[log.category] }} />
                {dict.cats[log.category]} · {formatHours(log.hours)} {dict.common.hoursShort}
              </p>
              <p className="text-sm text-ink/70">
                {log.note} · {dict.source[log.source as keyof Dictionary["source"]] ?? log.source}
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-coral"
              onClick={async () => {
                await deleteLog(log.id);
                router.refresh();
              }}
            >
              {dict.common.delete}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HabitBoard({
  habits,
  date,
  dict,
}: {
  habits: { id: string; key: string; name: string; done: boolean }[];
  date: string;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [name, setName] = useState("");

  return (
    <section className="panel p-5">
      <h2 className="display text-2xl text-indigo">{dict.dash.habitsTitle}</h2>
      <p className="mt-1 text-sm text-ink/70">{dict.habits.help}</p>
      <ul className="mt-3 space-y-2">
        {habits.map((habit) => (
          <li key={habit.id}>
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left ${habit.done ? "bg-ocean text-cream" : "bg-cream"}`}
              onClick={async () => {
                await toggleHabit(habit.id, date, !habit.done);
                router.refresh();
              }}
              aria-pressed={habit.done}
            >
              <span>{habitName(dict, habit)}</span>
              <span className="text-xs font-semibold">{habit.done ? dict.habits.done : dict.habits.open}</span>
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim()) return;
          await addHabit(name);
          setName("");
          router.refresh();
        }}
      >
        <label className="sr-only" htmlFor="habit-name">
          {dict.habits.placeholder}
        </label>
        <input id="habit-name" className="field" value={name} placeholder={dict.habits.placeholder} onChange={(event) => setName(event.target.value)} />
        <button className="btn btn-ink" type="submit">
          {dict.habits.add}
        </button>
      </form>
    </section>
  );
}

export function ReflectionForm({
  dict,
  date,
  initial,
}: {
  dict: Dictionary;
  date: string;
  initial: { energy: number; mood: number; focus: number; note: string } | null;
}) {
  const router = useRouter();
  const [energy, setEnergy] = useState(initial?.energy ?? 3);
  const [mood, setMood] = useState(initial?.mood ?? 3);
  const [focus, setFocus] = useState(initial?.focus ?? 3);
  const [note, setNote] = useState(initial?.note ?? "");
  const [saved, setSaved] = useState(false);

  const fields = [
    [dict.dash.energy, energy, setEnergy],
    [dict.dash.mood, mood, setMood],
    [dict.dash.focus, focus, setFocus],
  ] as const;

  return (
    <section className="panel p-5">
      <h2 className="display text-2xl text-indigo">{dict.dash.checkin}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {fields.map(([label, value, setValue]) => (
          <label key={label} className="text-sm font-semibold">
            {label}: {value}
            <input className="mt-2 w-full accent-ocean" type="range" min={1} max={5} value={value} onChange={(event) => setValue(Number(event.target.value))} />
          </label>
        ))}
      </div>
      <label className="mt-3 block text-sm font-semibold">
        {dict.dash.reflectionNote}
        <input className="field mt-1" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button
        type="button"
        className="btn btn-gold mt-3"
        onClick={async () => {
          await saveReflection({ date, energy, mood, focus, note });
          setSaved(true);
          router.refresh();
        }}
      >
        {dict.dash.saveReflection}
      </button>
      {saved ? <p className="mt-2 text-sm text-ocean">{dict.dash.saved}</p> : null}
    </section>
  );
}

export function CategoryMeters({
  dict,
  actual,
  goals,
}: {
  dict: Dictionary;
  actual: Record<Category, number>;
  goals: Record<Category, number>;
}) {
  return (
    <div className="space-y-3">
      {(Object.keys(actual) as Category[]).map((category) => {
        const goal = goals[category] || 0;
        const width = goal > 0 ? Math.min(100, (actual[category] / goal) * 100) : 0;
        return (
          <div key={category}>
            <div className="flex justify-between text-sm">
              <span>{dict.cats[category]}</span>
              <span>
                {formatHours(actual[category])} / {formatHours(goal)} {dict.common.hoursShort}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full" style={{ width: `${width}%`, background: CATEGORY_COLORS[category] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
