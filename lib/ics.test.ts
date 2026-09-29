import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPublicCalendarUrl, parseIcs } from "./ics";

const SAMPLE = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:evt-1
SUMMARY:Reyinyon kliyan
DTSTART:20260929T140000Z
DTEND:20260929T153000Z
END:VEVENT
BEGIN:VEVENT
UID:evt-2
SUMMARY:Jounen fanmi
DTSTART;VALUE=DATE:20260930
DTEND;VALUE=DATE:20261001
END:VEVENT
END:VCALENDAR`;

describe("ics", () => {
  it("parses timed and all-day events", () => {
    const events = parseIcs(SAMPLE);
    assert.equal(events.length, 2);
    assert.equal(events[0]?.title, "Reyinyon kliyan");
    assert.equal(events[0]?.hours, 1.5);
    assert.equal(events[0]?.allDay, false);
    assert.equal(events[1]?.allDay, true);
    assert.equal(events[1]?.hours, 0);
    assert.equal(events[1]?.date, "2026-09-30");
  });

  it("rejects private and non-https calendar urls", () => {
    assert.equal(isPublicCalendarUrl("http://example.com/cal.ics").ok, false);
    assert.equal(isPublicCalendarUrl("https://localhost/cal.ics").ok, false);
    assert.equal(isPublicCalendarUrl("https://10.0.0.5/cal.ics").ok, false);
    assert.equal(isPublicCalendarUrl("https://calendar.example.com/basic.ics").ok, true);
  });
});
