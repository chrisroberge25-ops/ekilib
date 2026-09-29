export async function synthesizeSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error("missing_key");
  if (!voiceId.trim()) throw new Error("missing_voice");
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId.trim())}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 800),
        model_id: "eleven_multilingual_v2",
      }),
    },
  );
  if (!response.ok) throw new Error(`eleven_${response.status}`);
  return response.arrayBuffer();
}

export function resolvedVoiceId(userVoiceId: string): string {
  return userVoiceId.trim() || process.env.ELEVENLABS_VOICE_ID?.trim() || "";
}
