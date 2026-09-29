import { SYSTEM_PROMPT } from "./chat";

export async function completeChat(messages: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("missing_key");
  const base = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 500,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-12)],
    }),
  });
  if (!response.ok) throw new Error(`openai_${response.status}`);
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error("empty");
  return text.trim();
}
