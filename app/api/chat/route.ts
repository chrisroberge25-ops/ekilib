import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  demoReply,
  detectLocale,
  finalizeAssistantText,
  needsCareBoundary,
  systemPromptFor,
  type Proposal,
} from "@/lib/chat";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/locale";
import { completeChat } from "@/lib/openai";

const REWRITE =
  "Reekri dènye repons lan an Kreyòl ayisyen sèlman. Kenbe menm konsèy la. Pa itilize angle ni franse.";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { message?: string; dropProposal?: boolean } | null;
  const text = String(body?.message ?? "").trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const dropProposal = Boolean(body?.dropProposal);

  const account: Locale = user.locale === "fr" || user.locale === "en" ? user.locale : "ht";
  const locale = detectLocale(text, account);
  await prisma.chatMessage.create({ data: { userId: user.id, role: "user", content: text } });

  let mode: "demo" | "live" = "demo";
  let fallback = false;
  let reply: { text: string; proposal: Proposal | null } = demoReply(text, locale);
  if (dropProposal) reply = { ...reply, proposal: null };

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
        const raw = await completeChat(ordered, systemPromptFor(locale));
        let finalized = finalizeAssistantText(raw, text, account, dropProposal);
        if (!finalized.languageOk) {
          const rewritten = await completeChat(
            [
              ...ordered,
              { role: "assistant", content: finalized.text || raw },
              { role: "user", content: REWRITE },
            ],
            systemPromptFor("ht"),
          );
          finalized = finalizeAssistantText(rewritten, text, account, dropProposal);
        }
        if (finalized.languageOk && finalized.text) {
          reply = { text: finalized.text, proposal: finalized.proposal };
          mode = "live";
        } else {
          const demo = demoReply(text, "ht");
          reply = { text: demo.text, proposal: dropProposal ? null : demo.proposal };
        }
      } catch {
        fallback = true;
        reply = demoReply(text, locale);
        if (dropProposal) reply = { ...reply, proposal: null };
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
