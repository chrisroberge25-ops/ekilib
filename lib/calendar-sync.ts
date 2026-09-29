import { parseUtterance } from "./parser";
import type { IcsEvent } from "./ics";
import type { GoogleCalendarEvent } from "./google";
import { prisma } from "./db";

export type NormalizedEvent = {
  uid: string;
  title: string;
  start: Date | null;
  end: Date | null;
  allDay: boolean;
  date: string;
  hours: number;
};

export function fromIcs(event: IcsEvent): NormalizedEvent {
  return {
    uid: event.uid,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    date: event.date,
    hours: event.hours,
  };
}

export function fromGoogle(item: GoogleCalendarEvent): NormalizedEvent | null {
  const date = (item.start?.date || item.start?.dateTime || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const allDay = Boolean(item.start?.date && !item.start.dateTime);
  const start = item.start?.dateTime
    ? new Date(item.start.dateTime)
    : item.start?.date
      ? new Date(`${item.start.date}T12:00:00Z`)
      : null;
  const end = item.end?.dateTime
    ? new Date(item.end.dateTime)
    : item.end?.date
      ? new Date(`${item.end.date}T12:00:00Z`)
      : null;
  const hours =
    !allDay && start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
      ? Math.round(Math.min(16, Math.max(0, (end.getTime() - start.getTime()) / 3_600_000)) * 100) / 100
      : 0;
  return {
    uid: item.id || `${item.summary || "event"}-${date}`,
    title: (item.summary || "Evènman").slice(0, 180),
    start,
    end,
    allDay,
    date,
    hours,
  };
}

export async function upsertEvents(userId: string, connectionId: string, events: NormalizedEvent[]) {
  let count = 0;
  for (const event of events) {
    const parsed = parseUtterance(event.title);
    const externalId = `${connectionId}:${event.uid}`.slice(0, 190);
    await prisma.calendarEvent.upsert({
      where: { userId_externalId: { userId, externalId } },
      create: {
        userId,
        connectionId,
        externalId,
        title: event.title,
        startAt: event.start,
        endAt: event.end,
        date: event.date,
        category: parsed.category ?? "",
        hours: event.hours,
        allDay: event.allDay,
      },
      update: {
        title: event.title,
        startAt: event.start,
        endAt: event.end,
        date: event.date,
        category: parsed.category ?? "",
        hours: event.hours,
        allDay: event.allDay,
      },
    });
    count += 1;
  }
  return count;
}
