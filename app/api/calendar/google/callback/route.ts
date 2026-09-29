import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exchangeGoogleCode, googleConfigured } from "@/lib/google";
import { appUrl } from "@/lib/integrations";

export async function GET(request: Request) {
  const origin = appUrl();
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));
  if (!googleConfigured()) return NextResponse.redirect(new URL("/app/calendar?setup=google", origin));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("ekilib_oauth_state")?.value;
  jar.delete("ekilib_oauth_state");
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/app/calendar?error=state", origin));
  }

  try {
    const token = await exchangeGoogleCode(code);
    const existing = await prisma.calendarConnection.findFirst({
      where: { userId: user.id, provider: "google" },
    });
    const data = {
      status: "connected",
      label: "Google Calendar",
      accessToken: token.access_token,
      refreshToken: token.refresh_token || existing?.refreshToken || "",
      tokenExpiry: new Date(Date.now() + (token.expires_in ?? 3600) * 1000),
      lastError: "",
      lastSyncAt: new Date(),
    };
    if (existing) {
      await prisma.calendarConnection.update({ where: { id: existing.id }, data });
    } else {
      await prisma.calendarConnection.create({
        data: { userId: user.id, provider: "google", ...data },
      });
    }
    return NextResponse.redirect(new URL("/app/calendar?connected=google", origin));
  } catch {
    return NextResponse.redirect(new URL("/app/calendar?error=google", origin));
  }
}
