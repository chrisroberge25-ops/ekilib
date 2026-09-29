"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, getCurrentUser } from "./auth";
import { upsertEvents, fromIcs } from "./calendar-sync";
import { CATEGORIES, isCategory, type Category } from "./categories";
import { zonedDateString } from "./dates";
import { prisma } from "./db";
import { listGoogleEvents, refreshGoogleAccessToken } from "./google";
import { isPublicCalendarUrl, parseIcs } from "./ics";
import { isLocale, type Locale } from "./locale";
import { provisionUser } from "./provision";

export type ActionResult = { ok: true } | { ok: false; error: string };

function refreshApp() {
  revalidatePath("/app");
  revalidatePath("/app/log");
  revalidatePath("/app/insights");
  revalidatePath("/app/habits");
  revalidatePath("/app/calendar");
  revalidatePath("/app/chat");
  revalidatePath("/app/settings");
}

const logSchema = z.object({
  category: z.enum(CATEGORIES),
  hours: z.number().gt(0).max(24),
  note: z.string().max(280).optional().default(""),
  rawText: z.string().max(500).optional().default(""),
  source: z.enum(["voice", "chat", "manual", "calendar"]).default("manual"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function monthCount(userId: string, month: string) {
  return prisma.timeLog.count({ where: { userId, date: { startsWith: month } } });
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/app");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { ok: false, error: "invalid" };
  }
  await createSession(user.id);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/app");
}

export async function demoLoginAction(): Promise<void> {
  const formData = new FormData();
  formData.set("email", "demo@ekilib.app");
  formData.set("password", "ekilib-demo");
  formData.set("next", "/app");
  const result = await loginAction(formData);
  if (result && !result.ok) redirect("/login?demo=1");
}

export async function signupAction(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const localeValue = String(formData.get("locale") || "ht");
  const locale: Locale = isLocale(localeValue) ? localeValue : "ht";
  if (name.length < 2 || name.length > 80) return { ok: false, error: "name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "email" };
  if (password.length < 8) return { ok: false, error: "password" };
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "exists" };
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      locale,
    },
  });
  await provisionUser(user.id);
  await createSession(user.id);
  redirect("/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function createLog(input: z.infer<typeof logSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (user.plan !== "PRO") {
    const count = await monthCount(user.id, parsed.data.date.slice(0, 7));
    if (count >= 80) return { ok: false, error: "limit" };
  }
  await prisma.timeLog.create({
    data: {
      userId: user.id,
      category: parsed.data.category,
      hours: Math.round(parsed.data.hours * 100) / 100,
      note: parsed.data.note,
      rawText: parsed.data.rawText || parsed.data.note,
      source: parsed.data.source,
      date: parsed.data.date,
    },
  });
  refreshApp();
  return { ok: true };
}

export async function createLogForm(formData: FormData): Promise<ActionResult> {
  const hours = Number(String(formData.get("hours") || "").replace(",", "."));
  return createLog({
    category: String(formData.get("category") || "") as Category,
    hours,
    note: String(formData.get("note") || ""),
    rawText: String(formData.get("rawText") || formData.get("note") || ""),
    source: (String(formData.get("source") || "manual") as "manual"),
    date: String(formData.get("date") || ""),
  });
}

export async function deleteLog(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  await prisma.timeLog.deleteMany({ where: { id, userId: user.id } });
  refreshApp();
  return { ok: true };
}

export async function toggleHabit(habitId: string, date: string, done: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: user.id, active: true } });
  if (!habit || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "invalid" };
  if (!done) {
    await prisma.habitCheck.deleteMany({ where: { habitId, date } });
  } else {
    await prisma.habitCheck.upsert({
      where: { habitId_date: { habitId, date } },
      create: { habitId, date, done: true },
      update: { done: true },
    });
  }
  refreshApp();
  return { ok: true };
}

export async function addHabit(name: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  const clean = name.trim().slice(0, 80);
  if (clean.length < 2) return { ok: false, error: "name" };
  const count = await prisma.habit.count({ where: { userId: user.id, active: true } });
  await prisma.habit.create({
    data: { userId: user.id, name: clean, sortOrder: count + 1 },
  });
  refreshApp();
  return { ok: true };
}

export async function saveReflection(input: {
  date: string;
  energy: number;
  mood: number;
  focus: number;
  note: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "invalid" };
  const score = (value: number) => Math.min(5, Math.max(1, Math.round(value)));
  await prisma.reflection.upsert({
    where: { userId_date: { userId: user.id, date: input.date } },
    create: {
      userId: user.id,
      date: input.date,
      energy: score(input.energy),
      mood: score(input.mood),
      focus: score(input.focus),
      note: input.note.slice(0, 280),
    },
    update: {
      energy: score(input.energy),
      mood: score(input.mood),
      focus: score(input.focus),
      note: input.note.slice(0, 280),
    },
  });
  refreshApp();
  return { ok: true };
}

export async function updateGoals(goals: { slug: string; goalHours: number }[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  for (const goal of goals) {
    if (!isCategory(goal.slug)) return { ok: false, error: "invalid" };
    if (!Number.isFinite(goal.goalHours) || goal.goalHours < 0 || goal.goalHours > 16) {
      return { ok: false, error: "invalid" };
    }
  }
  await Promise.all(
    goals.map((goal) =>
      prisma.categoryGoal.update({
        where: { userId_slug: { userId: user.id, slug: goal.slug } },
        data: { goalHours: Math.round(goal.goalHours * 4) / 4 },
      }),
    ),
  );
  refreshApp();
  return { ok: true };
}

export async function updateSettings(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  const name = String(formData.get("name") || "").trim();
  const localeValue = String(formData.get("locale") || user.locale);
  const timezone = String(formData.get("timezone") || user.timezone).trim();
  const voiceId = String(formData.get("voiceId") || "").trim();
  if (name.length < 2) return { ok: false, error: "name" };
  if (!isLocale(localeValue)) return { ok: false, error: "locale" };
  if (!/^[A-Za-z0-9_/+-]{1,64}$/.test(timezone)) return { ok: false, error: "timezone" };
  if (voiceId && !/^[A-Za-z0-9]{8,40}$/.test(voiceId)) return { ok: false, error: "voice" };
  await prisma.user.update({
    where: { id: user.id },
    data: { name, locale: localeValue, timezone, voiceId },
  });
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  jar.set("ekilib_locale", localeValue, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  refreshApp();
  return { ok: true };
}

export async function setPlan(plan: "FREE" | "PRO"): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  await prisma.user.update({ where: { id: user.id }, data: { plan } });
  refreshApp();
  return { ok: true };
}

export async function importCalendar(formData: FormData): Promise<ActionResult & { count?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  const provider = String(formData.get("provider") || "ics");
  if (!["ics", "apple", "outlook"].includes(provider)) return { ok: false, error: "provider" };
  const pasted = String(formData.get("icsText") || "").trim();
  const url = String(formData.get("icsUrl") || "").trim();
  let text = pasted;
  if (!text && url) {
    const checked = isPublicCalendarUrl(url);
    if (!checked.ok) return { ok: false, error: checked.reason === "invalid" ? "invalidUrl" : checked.reason };
    try {
      const response = await fetch(checked.url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return { ok: false, error: "fetch" };
      text = await response.text();
    } catch {
      return { ok: false, error: "fetch" };
    }
  }
  if (text.length > 1_000_000) return { ok: false, error: "large" };
  const events = parseIcs(text);
  if (events.length === 0) return { ok: false, error: "empty" };
  const connection = await prisma.calendarConnection.create({
    data: {
      userId: user.id,
      provider,
      label: provider === "apple" ? "Apple" : provider === "outlook" ? "Outlook" : "ICS",
      status: "connected",
      icsUrl: url,
      lastSyncAt: new Date(),
    },
  });
  const count = await upsertEvents(user.id, connection.id, events.map(fromIcs));
  refreshApp();
  return { ok: true, count };
}

export async function syncGoogleCalendar(): Promise<ActionResult & { count?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  const connection = await prisma.calendarConnection.findFirst({
    where: { userId: user.id, provider: "google" },
    orderBy: { lastSyncAt: "desc" },
  });
  if (!connection?.accessToken) return { ok: false, error: "missing" };
  let token = connection.accessToken;
  try {
    if (connection.tokenExpiry && connection.tokenExpiry.getTime() < Date.now() + 30_000 && connection.refreshToken) {
      const refreshed = await refreshGoogleAccessToken(connection.refreshToken);
      token = refreshed.access_token;
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: token,
          tokenExpiry: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000),
          refreshToken: refreshed.refresh_token || connection.refreshToken,
        },
      });
    }
    const today = zonedDateString(new Date(), user.timezone);
    const timeMin = new Date(`${today}T00:00:00.000Z`);
    timeMin.setUTCDate(timeMin.getUTCDate() - 7);
    const timeMax = new Date(`${today}T00:00:00.000Z`);
    timeMax.setUTCDate(timeMax.getUTCDate() + 14);
    const items = await listGoogleEvents(token, timeMin.toISOString(), timeMax.toISOString());
    const { fromGoogle } = await import("./calendar-sync");
    const normalized = items.map(fromGoogle).filter((item): item is NonNullable<typeof item> => Boolean(item));
    const count = await upsertEvents(user.id, connection.id, normalized);
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date(), lastError: "", status: "connected" },
    });
    refreshApp();
    return { ok: true, count };
  } catch {
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { lastError: "sync", status: "error" },
    });
    return { ok: false, error: "sync" };
  }
}

export async function logCalendarEvent(eventId: string, hours: number, categoryInput?: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, userId: user.id } });
  if (!event) return { ok: false, error: "missing" };
  if (event.logId) return { ok: false, error: "exists" };
  const category = isCategory(categoryInput || "")
    ? (categoryInput as Category)
    : isCategory(event.category)
      ? event.category
      : null;
  if (!category) return { ok: false, error: "category" };
  const safeHours = Number.isFinite(hours) && hours > 0 ? Math.min(16, hours) : event.hours || 1;
  if (user.plan !== "PRO") {
    const count = await monthCount(user.id, event.date.slice(0, 7));
    if (count >= 80) return { ok: false, error: "limit" };
  }
  const log = await prisma.timeLog.create({
    data: {
      userId: user.id,
      category,
      hours: Math.round(safeHours * 100) / 100,
      note: event.title,
      rawText: event.title,
      source: "calendar",
      date: event.date,
    },
  });
  await prisma.calendarEvent.update({ where: { id: event.id }, data: { logId: log.id, hours: log.hours, category } });
  refreshApp();
  return { ok: true };
}

export async function deleteConnection(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  await prisma.calendarConnection.deleteMany({ where: { id, userId: user.id } });
  refreshApp();
  return { ok: true };
}

export async function setLocale(locale: string) {
  const user = await getCurrentUser();
  if (!user || !isLocale(locale)) return;
  await prisma.user.update({ where: { id: user.id }, data: { locale } });
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  jar.set("ekilib_locale", locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  refreshApp();
}

export async function readLocale(): Promise<Locale> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const value = jar.get("ekilib_locale")?.value;
  return isLocale(value) ? value : "ht";
}
