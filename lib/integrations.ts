import { selectSttProvider } from "./stt";

export type IntegrationStatus = {
  openai: boolean;
  stt: boolean;
  eleven: boolean;
  voice: boolean;
  google: boolean;
};

export function integrationStatus(userVoiceId = ""): IntegrationStatus {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    stt: selectSttProvider() !== null,
    eleven: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    voice: Boolean(userVoiceId.trim() || process.env.ELEVENLABS_VOICE_ID?.trim()),
    google: Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()),
  };
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function googleRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI?.trim() || `${appUrl()}/api/calendar/google/callback`;
}
