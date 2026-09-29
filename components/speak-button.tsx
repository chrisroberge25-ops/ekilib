"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";

export function SpeakButton({ text, dict, autoPlay = false }: { text: string; dict: Dictionary; autoPlay?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const started = useRef(false);

  async function speak() {
    setState("loading");
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        setState("error");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
      setState("idle");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    if (!autoPlay || started.current) return;
    started.current = true;
    void speak();
    // Speak once for this mounted reply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className="text-sm font-semibold text-ocean" onClick={speak} disabled={state === "loading"}>
        {state === "loading" ? dict.chat.speaking : dict.chat.speak}
      </button>
      {state === "error" ? <span className="max-w-xs text-xs text-coral">{dict.chat.voiceMissing}</span> : null}
    </span>
  );
}
