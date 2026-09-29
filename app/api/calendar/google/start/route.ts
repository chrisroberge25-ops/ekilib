import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { googleAuthUrl, googleConfigured } from "@/lib/google";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/app/calendar?setup=google", origin));
  }
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("ekilib_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(googleAuthUrl(state));
}
