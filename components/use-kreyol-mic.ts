"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";

export type MicPhase = "idle" | "recording" | "transcribing";
export type MicError = "" | "unsupported" | "mic" | "offline" | "stt_unconfigured" | "stt_failed" | "empty_audio" | "auth";

const MAX_MS = 20_000;

function preferredMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function unlockAudio() {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const audio = new Ctx();
  void audio.resume().catch(() => undefined);
}

export function useKreyolMic(locale: Locale, onTranscript: (text: string) => void) {
  const [phase, setPhase] = useState<MicPhase>("idle");
  const [error, setError] = useState<MicError>("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  function clearTimer() {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }

  async function upload(blob: Blob) {
    if (!navigator.onLine) {
      setError("offline");
      setPhase("idle");
      return;
    }
    if (blob.size < 400) {
      setError("empty_audio");
      setPhase("idle");
      return;
    }
    setPhase("transcribing");
    try {
      const body = new FormData();
      body.append("audio", blob, "speech.webm");
      body.append("locale", locale);
      const response = await fetch("/api/stt", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as { text?: string; error?: string } | null;
      if (!response.ok || !data?.text?.trim()) {
        const code = data?.error;
        if (code === "auth" || code === "stt_unconfigured" || code === "empty_audio" || code === "stt_failed") {
          setError(code);
        } else {
          setError("stt_failed");
        }
        setPhase("idle");
        return;
      }
      setError("");
      setPhase("idle");
      onTranscriptRef.current(data.text.trim());
    } catch {
      setError("stt_failed");
      setPhase("idle");
    }
  }

  function stop() {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("unsupported");
      return;
    }
    if (!navigator.onLine) {
      setError("offline");
      return;
    }
    unlockAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = preferredMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        clearTimer();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || "audio/webm" });
        recorderRef.current = null;
        void upload(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setPhase("recording");
      stopTimerRef.current = window.setTimeout(() => stop(), MAX_MS);
    } catch {
      setError("mic");
      setPhase("idle");
    }
  }

  function toggle() {
    unlockAudio();
    if (phase === "recording") {
      stop();
      return;
    }
    if (phase === "idle") void start();
  }

  return { phase, error, toggle, busy: phase !== "idle" };
}

export function micMessage(dict: Dictionary, error: MicError): string {
  if (!error) return "";
  if (error === "unsupported") return dict.log.unsupported;
  if (error === "mic") return dict.log.micDenied;
  if (error === "offline") return dict.log.sttOffline;
  if (error === "stt_unconfigured") return dict.log.sttMissing;
  if (error === "auth") return dict.auth.errors.auth;
  return dict.log.sttFailed;
}
