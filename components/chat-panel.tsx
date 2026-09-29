"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createLog } from "@/lib/actions";
import { demoReply, type Proposal } from "@/lib/chat";
import { errorText, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";
import { bindVoiceListener } from "@/lib/voice-bus";
import { MicIcon } from "./icons";
import { SpeakButton } from "./speak-button";
import { micMessage, useKreyolMic } from "./use-kreyol-mic";

function readProposal(raw: string): Proposal | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Proposal;
  } catch {
    return null;
  }
}

type Message = {
  id: string;
  role: string;
  content: string;
  proposal: Proposal | null;
  mode?: "demo" | "live";
  fallback?: boolean;
  speak?: boolean;
};

type SendOptions = { speak?: boolean; dropProposal?: boolean };

export function ChatPanel({
  dict,
  locale,
  date,
  initial,
  compact = false,
}: {
  dict: Dictionary;
  locale: Locale;
  date: string;
  initial: { id: string; role: string; content: string; proposal: string }[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(
    initial.slice(compact ? -6 : 0).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      proposal: readProposal(message.proposal),
    })),
  );
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const pendingRef = useRef(false);
  const sendRef = useRef<(message: string, options?: SendOptions) => Promise<void>>(async () => undefined);

  async function send(raw?: string, options?: SendOptions) {
    const message = (raw ?? text).trim();
    if (!message || pendingRef.current) return;
    pendingRef.current = true;
    setText("");
    setPending(true);
    setNotice("");
    const localId = `local-${Date.now()}`;
    setMessages((current) => [...current, { id: localId, role: "user", content: message, proposal: null }]);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const reply = demoReply(message, locale);
      setMessages((current) => [
        ...current,
        {
          id: `${localId}-a`,
          role: "assistant",
          content: reply.text,
          proposal: options?.dropProposal ? null : reply.proposal,
          mode: "demo",
          speak: options?.speak,
        },
      ]);
      setNotice(dict.offline.offline);
      pendingRef.current = false;
      setPending(false);
      return;
    }
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, dropProposal: Boolean(options?.dropProposal) }),
      });
      const data = (await response.json()) as {
        id?: string;
        text?: string;
        proposal?: Proposal | null;
        mode?: "demo" | "live";
        fallback?: boolean;
        error?: string;
      };
      if (!response.ok || !data.text) {
        setNotice(errorText(dict, data.error || "auth"));
        return;
      }
      setMessages((current) => [
        ...current,
        {
          id: data.id || `${localId}-a`,
          role: "assistant",
          content: data.text || "",
          proposal: data.proposal ?? null,
          mode: data.mode,
          fallback: data.fallback,
          speak: options?.speak,
        },
      ]);
    } catch {
      setNotice(dict.offline.offline);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  sendRef.current = send;

  const mic = useKreyolMic(locale, (transcript) => {
    void sendRef.current(transcript, { speak: true });
  });

  useEffect(() => {
    return bindVoiceListener((utterance) => {
      void sendRef.current(utterance.text, { speak: true, dropProposal: utterance.dropProposal });
    });
  }, []);

  async function confirm(proposal: Proposal, id: string) {
    const result = await createLog({
      category: proposal.category,
      hours: proposal.hours,
      note: proposal.note,
      rawText: proposal.note,
      source: "chat",
      date,
    });
    if (!result.ok) {
      setNotice(errorText(dict, result.error));
      return;
    }
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, proposal: null } : message)));
    setNotice(dict.chat.confirmed);
    router.refresh();
  }

  return (
    <section className="panel flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="display text-3xl text-indigo">{dict.chat.title}</h2>
          {!compact ? <p className="mt-1 text-sm text-ink/70">{dict.chat.intro}</p> : null}
        </div>
      </div>
      <div className={`mt-4 space-y-3 overflow-y-auto ${compact ? "max-h-80" : "max-h-[32rem]"}`}>
        {messages.length === 0 ? <p className="text-sm text-ink/60">{dict.chat.empty}</p> : null}
        {messages.map((message) => (
          <article key={message.id} className={`rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "bg-indigo text-cream" : "bg-cream text-ink"}`}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
              {message.role === "user" ? dict.chat.you : dict.chat.advisor}
              {message.mode ? ` · ${message.mode === "live" ? dict.chat.live : dict.chat.demo}` : ""}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            {message.fallback ? <p className="mt-1 text-xs opacity-80">{dict.chat.fallback}</p> : null}
            {message.role === "assistant" ? (
              <div className="mt-2">
                <SpeakButton text={message.content} dict={dict} autoPlay={Boolean(message.speak)} />
              </div>
            ) : null}
            {message.proposal ? (
              <button type="button" className="btn btn-gold mt-2" onClick={() => confirm(message.proposal as Proposal, message.id)}>
                {dict.chat.confirmLog}: {dict.cats[message.proposal.category]} · {message.proposal.hours} {dict.common.hoursShort}
              </button>
            ) : null}
          </article>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="chat-input">
          {dict.chat.title}
        </label>
        <input
          id="chat-input"
          className="field"
          value={text}
          placeholder={dict.chat.placeholder}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          className={`btn ${mic.phase === "recording" ? "btn-coral" : "btn-ink"}`}
          onClick={mic.toggle}
          disabled={pending || mic.phase === "transcribing"}
          aria-pressed={mic.phase === "recording"}
        >
          <MicIcon />
          {mic.phase === "recording" ? dict.log.stop : mic.phase === "transcribing" ? dict.log.transcribing : dict.log.listen}
        </button>
        <button type="button" className="btn btn-ink" onClick={() => void send()} disabled={pending}>
          {dict.chat.send}
        </button>
      </div>
      {mic.error ? <p className="mt-2 text-sm text-coral">{micMessage(dict, mic.error)}</p> : null}
      {notice ? <p className="mt-2 text-sm text-ocean">{notice}</p> : null}
    </section>
  );
}
