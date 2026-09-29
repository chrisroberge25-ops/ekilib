"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLog } from "@/lib/actions";
import { demoReply } from "@/lib/chat";
import { CATEGORIES, type Category } from "@/lib/categories";
import { errorText, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";
import { parseUtterance } from "@/lib/parser";
import { emitVoiceUtterance } from "@/lib/voice-bus";
import { MicIcon } from "./icons";
import { SpeakButton } from "./speak-button";
import { micMessage, useKreyolMic } from "./use-kreyol-mic";

type Draft = { category: Category | ""; hours: string; note: string; raw: string; confidence: "high" | "low" };
type Queued = { category: Category; hours: number; note: string; rawText: string; date: string };

const QUEUE_KEY = "ekilib-queue";

function readQueue(): Queued[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as Queued[]) : [];
  } catch {
    return [];
  }
}

export function LogComposer({ dict, locale, date }: { dict: Dictionary; locale: Locale; date: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState(false);
  const [pending, setPending] = useState(false);
  const [localReply, setLocalReply] = useState("");

  async function flush() {
    if (!navigator.onLine) return;
    const queued = readQueue();
    if (queued.length === 0) return;
    const remain: Queued[] = [];
    for (const item of queued) {
      const result = await createLog({ ...item, source: "voice" });
      if (!result.ok) remain.push(item);
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remain));
    if (remain.length !== queued.length) router.refresh();
  }

  useEffect(() => {
    const onOnline = () => {
      void flush();
    };
    window.addEventListener("online", onOnline);
    void flush();
    return () => window.removeEventListener("online", onOnline);
    // flush closes over date-independent queue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function preview(value: string) {
    const parsed = parseUtterance(value);
    setDraft({
      category: parsed.category ?? "",
      hours: parsed.hours ? String(parsed.hours) : "",
      note: parsed.note,
      raw: value,
      confidence: parsed.confidence,
    });
  }

  async function advise(transcript: string, dropProposal: boolean) {
    if (!navigator.onLine) {
      setLocalReply(demoReply(transcript, locale).text);
      return;
    }
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: transcript, dropProposal }),
    });
    const data = (await response.json().catch(() => null)) as { text?: string } | null;
    if (response.ok && data?.text) setLocalReply(data.text);
  }

  function onTranscript(transcript: string) {
    setText(transcript);
    setLocalReply("");
    const parsed = parseUtterance(transcript);
    const loggable = Boolean(parsed.category && parsed.hours);
    if (loggable) preview(transcript);
    else setDraft(null);
    const handled = emitVoiceUtterance({ text: transcript, dropProposal: loggable });
    if (!handled) void advise(transcript, loggable);
  }

  const mic = useKreyolMic(locale, onTranscript);

  async function saveDraft() {
    if (!draft?.category || !draft.hours) {
      setMessage(dict.log.missing);
      return;
    }
    const hours = Number(draft.hours.replace(",", "."));
    const payload: Queued = {
      category: draft.category,
      hours,
      note: draft.note,
      rawText: draft.raw,
      date,
    };
    if (!navigator.onLine) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify([...readQueue(), payload]));
      setMessage(dict.log.offlineQueued);
      setDraft(null);
      setText("");
      return;
    }
    setPending(true);
    const result = await createLog({ ...payload, source: "voice" });
    setPending(false);
    if (!result.ok) {
      setMessage(errorText(dict, result.error));
      return;
    }
    setDraft(null);
    setText("");
    setMessage("");
    router.refresh();
  }

  async function saveManual(formData: FormData) {
    const category = String(formData.get("category") || "") as Category;
    const hours = Number(String(formData.get("hours") || "").replace(",", "."));
    const note = String(formData.get("note") || "");
    setPending(true);
    const result = await createLog({
      category,
      hours,
      note,
      rawText: note,
      source: "manual",
      date: String(formData.get("date") || date),
    });
    setPending(false);
    if (!result.ok) {
      setMessage(errorText(dict, result.error));
      return;
    }
    setManual(false);
    setMessage("");
    router.refresh();
  }

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="display text-3xl text-indigo">{dict.log.prompt}</h2>
          <p className="mt-1 text-sm text-ink/70">{dict.log.voiceHint}</p>
        </div>
        <SpeakButton text={dict.log.prompt} dict={dict} />
      </div>
      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="utterance">
          {dict.log.prompt}
        </label>
        <input
          id="utterance"
          className="field"
          value={text}
          placeholder={dict.log.placeholder}
          onChange={(event) => {
            setText(event.target.value);
            if (event.target.value.trim()) preview(event.target.value);
            else setDraft(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && text.trim()) {
              event.preventDefault();
              preview(text);
            }
          }}
        />
        <button
          type="button"
          className={`btn ${mic.phase === "recording" ? "btn-coral" : "btn-ink"}`}
          onClick={mic.toggle}
          disabled={mic.phase === "transcribing"}
          aria-pressed={mic.phase === "recording"}
        >
          <MicIcon />
          {mic.phase === "recording" ? dict.log.stop : mic.phase === "transcribing" ? dict.log.transcribing : dict.log.listen}
        </button>
      </div>
      {mic.error ? <p className="mt-2 text-sm text-coral">{micMessage(dict, mic.error)}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">{dict.log.examples}</span>
        {dict.log.chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="rounded-full bg-cream px-3 py-1 text-sm text-indigo"
            onClick={() => {
              setText(chip);
              preview(chip);
            }}
          >
            {chip}
          </button>
        ))}
      </div>
      {draft ? (
        <div className="mt-4 rounded-2xl border border-gold/50 bg-cream p-4">
          <p className="text-sm text-ocean">{draft.confidence === "high" ? dict.log.high : dict.log.low}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold">
              {dict.log.category}
              <select
                className="field mt-1"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}
              >
                <option value="">{dict.log.category}</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {dict.cats[category]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              {dict.log.hours}
              <input
                className="field mt-1"
                inputMode="decimal"
                value={draft.hours}
                onChange={(event) => setDraft({ ...draft, hours: event.target.value })}
              />
            </label>
            <label className="text-sm font-semibold">
              {dict.log.note}
              <input className="field mt-1" value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-gold" onClick={saveDraft} disabled={pending}>
              {dict.log.confirm}
            </button>
            <button type="button" className="btn btn-ghost border-indigo/20" onClick={() => setDraft(null)}>
              {dict.log.discard}
            </button>
          </div>
        </div>
      ) : null}
      <button type="button" className="mt-4 text-sm font-semibold text-ocean" onClick={() => setManual((value) => !value)}>
        {dict.log.manual}
      </button>
      {manual ? (
        <form action={saveManual} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            {dict.log.category}
            <select className="field mt-1" name="category" defaultValue="work">
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {dict.cats[category]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            {dict.log.hours}
            <input className="field mt-1" name="hours" inputMode="decimal" required placeholder="1.5" />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            {dict.log.note}
            <input className="field mt-1" name="note" />
          </label>
          <input type="hidden" name="date" value={date} />
          <button className="btn btn-ink sm:col-span-2" type="submit" disabled={pending}>
            {dict.log.save}
          </button>
        </form>
      ) : null}
      {localReply ? (
        <div className="mt-4 rounded-2xl bg-cream p-4 text-sm">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ocean">{dict.chat.advisor}</p>
          <p className="whitespace-pre-wrap leading-relaxed">{localReply}</p>
          <div className="mt-2">
            <SpeakButton key={localReply} text={localReply} dict={dict} autoPlay />
          </div>
        </div>
      ) : null}
      {message ? <p className="mt-3 text-sm text-coral">{message}</p> : null}
    </section>
  );
}
