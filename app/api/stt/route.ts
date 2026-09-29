import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { Locale } from "@/lib/locale";
import { audioMeta, sttLanguage, transcribeSpeech } from "@/lib/stt";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 4_000_000;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const audio = form.get("audio");
  if (!(audio instanceof File)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (audio.size < 400) return NextResponse.json({ error: "empty_audio" }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "large" }, { status: 413 });

  const localeRaw = String(form.get("locale") || user.locale || "ht");
  const locale: Locale = localeRaw === "fr" || localeRaw === "en" ? localeRaw : "ht";
  const meta = audioMeta(audio.type || "audio/webm");
  const bytes = new Uint8Array(await audio.arrayBuffer());
  try {
    const result = await transcribeSpeech(bytes, meta.mime, sttLanguage(locale));
    return NextResponse.json({ text: result.text, provider: result.provider });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "stt_failed";
    if (reason === "stt_unconfigured") {
      return NextResponse.json({ error: "stt_unconfigured" }, { status: 503 });
    }
    if (reason === "empty_transcript") {
      return NextResponse.json({ error: "empty_audio" }, { status: 422 });
    }
    console.error("stt_failed", reason);
    return NextResponse.json({ error: "stt_failed" }, { status: 502 });
  }
}
