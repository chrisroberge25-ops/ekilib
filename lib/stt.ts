import type { Locale } from "./locale";
import { fold } from "./parser";

export type SttProvider = "groq" | "openai";

const HT_PROMPT = "Bonjou. Mwen travay twa èdtan. Mwen dòmi. Mwen fè espò. Kijan balans lan ye?";

const JUNK = [/sous-titres/i, /amara\.org/i, /thanks for watching/i, /♪/];

export function sttLanguage(locale: Locale): "ht" | "fr" | "en" {
  if (locale === "fr") return "fr";
  if (locale === "en") return "en";
  return "ht";
}

export function selectSttProvider(
  env: Record<string, string | undefined> = process.env,
): SttProvider | null {
  const groq = Boolean(env.GROQ_API_KEY?.trim());
  const openai = Boolean(env.OPENAI_API_KEY?.trim());
  const forced = env.STT_PROVIDER?.trim().toLowerCase();
  if (forced === "groq") return groq ? "groq" : null;
  if (forced === "openai") return openai ? "openai" : null;
  if (groq) return "groq";
  if (openai) return "openai";
  return null;
}

export function audioMeta(type: string): { mime: string; filename: string } {
  const value = type.toLowerCase();
  if (value.includes("mp4") || value.includes("m4a") || value.includes("aac")) {
    return { mime: "audio/mp4", filename: "speech.m4a" };
  }
  if (value.includes("ogg")) return { mime: "audio/ogg", filename: "speech.ogg" };
  if (value.includes("wav")) return { mime: "audio/wav", filename: "speech.wav" };
  if (value.includes("mpeg") || value.includes("mp3")) return { mime: "audio/mpeg", filename: "speech.mp3" };
  return { mime: "audio/webm", filename: "speech.webm" };
}

function endpointFor(provider: SttProvider, env: Record<string, string | undefined>): string {
  if (provider === "groq") return "https://api.groq.com/openai/v1/audio/transcriptions";
  const base = (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  return `${base}/audio/transcriptions`;
}

function modelFor(provider: SttProvider, env: Record<string, string | undefined>): string {
  if (provider === "groq") return env.GROQ_STT_MODEL?.trim() || "whisper-large-v3";
  return env.OPENAI_STT_MODEL?.trim() || "whisper-1";
}

export async function transcribeSpeech(
  audio: Uint8Array,
  mime: string,
  language: string,
  env: Record<string, string | undefined> = process.env,
): Promise<{ text: string; provider: SttProvider }> {
  const provider = selectSttProvider(env);
  if (!provider) throw new Error("stt_unconfigured");
  const key = (provider === "groq" ? env.GROQ_API_KEY : env.OPENAI_API_KEY)?.trim();
  if (!key) throw new Error("stt_unconfigured");
  const meta = audioMeta(mime);
  const bytes = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: meta.mime }), meta.filename);
  form.append("model", modelFor(provider, env));
  form.append("language", language);
  form.append("temperature", "0");
  form.append("response_format", "json");
  if (language === "ht") form.append("prompt", HT_PROMPT);

  const response = await fetch(endpointFor(provider, env), {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!response.ok) throw new Error(`stt_${response.status}`);
  const data = (await response.json()) as { text?: string };
  const text = String(data.text ?? "").trim();
  if (!text || fold(text) === fold(HT_PROMPT) || JUNK.some((pattern) => pattern.test(text))) {
    throw new Error("empty_transcript");
  }
  return { text, provider };
}
