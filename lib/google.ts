import { googleRedirectUri } from "./integrations";

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID?.trim() || "",
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type GoogleToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

async function tokenRequest(body: URLSearchParams): Promise<GoogleToken> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("google_token");
  return (await response.json()) as GoogleToken;
}

export function exchangeGoogleCode(code: string) {
  return tokenRequest(
    new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID?.trim() || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  );
}

export function refreshGoogleAccessToken(refreshToken: string) {
  return tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID?.trim() || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
      grant_type: "refresh_token",
    }),
  );
}

export type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

export async function listGoogleEvents(accessToken: string, timeMin: string, timeMax: string) {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("maxResults", "40");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error("google_events");
  const data = (await response.json()) as { items?: GoogleCalendarEvent[] };
  return data.items ?? [];
}
