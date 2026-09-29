import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolvedVoiceId, synthesizeSpeech } from "@/lib/elevenlabs";
import { isKreyolText, speakableText, spellKreyolNumbers } from "@/lib/speech-text";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const raw = String(body?.text ?? "").trim();
  const clean = speakableText(raw);
  const text = isKreyolText(clean) ? spellKreyolNumbers(clean) : clean;
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const voiceId = resolvedVoiceId(user.voiceId);
  try {
    const audio = await synthesizeSpeech(text, voiceId);
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error";
    const status = reason === "missing_key" || reason === "missing_voice" ? 503 : 502;
    return NextResponse.json({ error: reason }, { status });
  }
}
