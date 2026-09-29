import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { integrationStatus } from "@/lib/integrations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  return NextResponse.json(integrationStatus(user.voiceId));
}
