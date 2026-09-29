import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { demoReply, extractProposal, needsCareBoundary, type Proposal } from "@/lib/chat";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/locale";
import { completeChat } from "@/lib/openai";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { message?: string } | null;
  const text = String(body?.message ?? "").trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

  const locale: Locale = user.locale === "fr" || user.locale === "en" ? user.locale : "ht";
  await prisma.chatMessage.create({ data: { userId: user.id, role: "user", content: text } });

  let mode: "demo" | "live" = "demo";
  let fallback = false;
  let reply: { text: string; proposal: Proposal | null } = demoReply(text, locale);

  if (!needsCareBoundary(text) && process.env.OPENAI_API_KEY?.trim()) {
    const since = new Date();
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    const count = await prisma.chatMessage.count({
      where: { userId: user.id, role: "assistant", createdAt: { gte: since } },
    });
    if (user.plan === "PRO" || count < 30) {
      try {
        const history = await prisma.chatMessage.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 12,
        });
        const ordered = history
          .reverse()
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            role: message.role as "user" | "assistant",
            content: message.content,
          }));
        const raw = await completeChat(ordered);
        const extracted = extractProposal(raw);
        reply = {
          text: extracted.clean || raw,
          proposal: extracted.proposal,
        };
        mode = "live";
      } catch {
        fallback = true;
        reply = demoReply(text, locale);
      }
    } else {
      fallback = true;
    }
  }

  const saved = await prisma.chatMessage.create({
    data: {
      userId: user.id,
      role: "assistant",
      content: reply.text,
      proposal: reply.proposal ? JSON.stringify(reply.proposal) : "",
    },
  });

  return NextResponse.json({
    id: saved.id,
    text: reply.text,
    proposal: reply.proposal,
    mode,
    fallback,
  });
}
