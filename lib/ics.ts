export type IcsEvent = {
  uid: string;
  title: string;
  start: Date | null;
  end: Date | null;
  allDay: boolean;
  date: string;
  hours: number;
};

export function unfoldIcs(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");
}

function parseStamp(value: string): { date: Date | null; allDay: boolean; day: string } {
  const raw = value.split(";")[0]?.trim() ?? "";
  if (/^\d{8}$/.test(raw)) {
    const day = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    return { date: new Date(`${day}T12:00:00Z`), allDay: true, day };
  }
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match) return { date: null, allDay: false, day: "" };
  const day = `${match[1]}-${match[2]}-${match[3]}`;
  const iso = `${day}T${match[4]}:${match[5]}:${match[6]}${match[7] ? "Z" : ""}`;
  const date = new Date(iso);
  const zonedDay = match[7] ? date.toISOString().slice(0, 10) : day;
  return { date: Number.isNaN(date.getTime()) ? null : date, allDay: false, day: zonedDay };
}

function hoursBetween(start: Date | null, end: Date | null, allDay: boolean): number {
  if (allDay || !start || !end) return 0;
  const diff = (end.getTime() - start.getTime()) / 3_600_000;
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round(Math.min(diff, 16) * 100) / 100;
}

export function parseIcs(text: string): IcsEvent[] {
  const unfolded = unfoldIcs(text);
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);
  const events: IcsEvent[] = [];
  for (const block of blocks) {
    const body = block.split("END:VEVENT")[0] ?? "";
    const lines = body.split("\n").map((line) => line.trim()).filter(Boolean);
    const fields = new Map<string, string>();
    for (const line of lines) {
      const split = line.indexOf(":");
      if (split === -1) continue;
      const name = line.slice(0, split).split(";")[0]?.toUpperCase() ?? "";
      fields.set(name, line.slice(split + 1).replace(/\\n/g, " ").replace(/\\,/g, ","));
    }
    const title = (fields.get("SUMMARY") || "Evènman").trim() || "Evènman";
    const start = parseStamp(fields.get("DTSTART") || "");
    const end = parseStamp(fields.get("DTEND") || "");
    const date = start.day || end.day;
    if (!date) continue;
    const uid = (fields.get("UID") || `${title}-${date}-${start.date?.toISOString() ?? "day"}`).slice(0, 180);
    events.push({
      uid,
      title: title.slice(0, 180),
      start: start.date,
      end: end.date,
      allDay: start.allDay,
      date,
      hours: hoursBetween(start.date, end.date, start.allDay),
    });
  }
  return events;
}

export function isPublicCalendarUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "https" };
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "private" };
  }
  const ip = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ip) {
    const a = Number(ip[1]);
    const b = Number(ip[2]);
    const privateRange =
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31);
    if (privateRange) return { ok: false, reason: "private" };
  }
  return { ok: true, url };
}
