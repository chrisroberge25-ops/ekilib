import { balanceScore, pickInsight, sumHours, tally, untrackedHours, type InsightId } from "./balance";
import { CATEGORIES, emptyHours, type Category } from "./categories";
import { addDays, hoursSinceMidnight, startOfWeek, zonedDateString } from "./dates";
import { prisma } from "./db";
import { integrationStatus, type IntegrationStatus } from "./integrations";

export type LogDTO = {
  id: string;
  category: Category;
  hours: number;
  note: string;
  source: string;
  date: string;
};

export type EventDTO = {
  id: string;
  title: string;
  date: string;
  category: string;
  hours: number;
  allDay: boolean;
  logged: boolean;
};

export type ConnectionDTO = {
  id: string;
  provider: string;
  label: string;
  status: string;
  icsUrl: string;
  lastError: string;
  lastSyncAt: string | null;
};

export type DashboardDTO = {
  today: string;
  weekStart: string;
  weekDates: string[];
  nowHours: number;
  goals: Record<Category, number>;
  todayLogs: LogDTO[];
  weekLogs: LogDTO[];
  todayByCat: Record<Category, number>;
  weekByCat: Record<Category, number>;
  score: number;
  untracked: number;
  insight: InsightId;
  habits: { id: string; key: string; name: string; done: boolean }[];
  reflection: { energy: number; mood: number; focus: number; note: string } | null;
  events: EventDTO[];
  connections: ConnectionDTO[];
  integrations: IntegrationStatus;
};

function asCategory(value: string): Category | null {
  return (CATEGORIES as readonly string[]).includes(value) ? (value as Category) : null;
}

export async function loadDashboard(userId: string, timezone: string, voiceId: string): Promise<DashboardDTO> {
  const today = zonedDateString(new Date(), timezone);
  const weekStart = startOfWeek(today);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const rangeStart = addDays(today, -21);

  const [goalRows, logRows, habits, checks, reflection, events, connections] = await Promise.all([
    prisma.categoryGoal.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
    prisma.timeLog.findMany({
      where: { userId, date: { gte: rangeStart } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.habit.findMany({ where: { userId, active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.habitCheck.findMany({ where: { date: today, habit: { userId } } }),
    prisma.reflection.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.calendarEvent.findMany({
      where: { userId, date: today },
      orderBy: { startAt: "asc" },
    }),
    prisma.calendarConnection.findMany({
      where: { userId },
      orderBy: { lastSyncAt: "desc" },
      select: {
        id: true,
        provider: true,
        label: true,
        status: true,
        icsUrl: true,
        lastError: true,
        lastSyncAt: true,
      },
    }),
  ]);

  const goals = emptyHours();
  for (const goal of goalRows) {
    const category = asCategory(goal.slug);
    if (category) goals[category] = goal.goalHours;
  }

  const logs: LogDTO[] = logRows.flatMap((log) => {
    const category = asCategory(log.category);
    if (!category) return [];
    return [{ id: log.id, category, hours: log.hours, note: log.note, source: log.source, date: log.date }];
  });

  const todayLogs = logs.filter((log) => log.date === today);
  const weekLogs = logs.filter((log) => weekDates.includes(log.date));
  const todayByCat = tally(todayLogs, [today]);
  const weekByCat = tally(weekLogs, weekDates);
  const score = balanceScore(todayByCat, goals);
  const untracked = untrackedHours({
    tracked: sumHours(todayByCat),
    date: today,
    today,
    nowHours: hoursSinceMidnight(new Date(), timezone),
  });
  const done = new Set(checks.filter((check) => check.done).map((check) => check.habitId));

  return {
    today,
    weekStart,
    weekDates,
    nowHours: hoursSinceMidnight(new Date(), timezone),
    goals,
    todayLogs,
    weekLogs,
    todayByCat,
    weekByCat,
    score,
    untracked,
    insight: pickInsight({ today: todayByCat, week: weekByCat, goals, score }),
    habits: habits.map((habit) => ({
      id: habit.id,
      key: habit.key,
      name: habit.name,
      done: done.has(habit.id),
    })),
    reflection: reflection
      ? {
          energy: reflection.energy ?? 3,
          mood: reflection.mood ?? 3,
          focus: reflection.focus ?? 3,
          note: reflection.note,
        }
      : null,
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      category: event.category,
      hours: event.hours,
      allDay: event.allDay,
      logged: Boolean(event.logId),
    })),
    connections: connections.map((connection) => ({
      ...connection,
      lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
    })),
    integrations: integrationStatus(voiceId),
  };
}

export async function loadMessages(userId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 40,
  });
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    proposal: message.proposal,
    createdAt: message.createdAt.toISOString(),
  }));
}
