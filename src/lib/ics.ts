/**
 * Minimal RFC 5545 (iCalendar) writer — enough to produce a .ics file that Apple Calendar,
 * Google Calendar, and Outlook can all import. Used today for a one-time "Export Calendar"
 * download from the dispatch board (see DispatchCalendar in src/app/dashboard/page.tsx).
 *
 * This is NOT a live subscription feed. A phone subscribing to a calendar (webcal://) polls a
 * stable server URL on its own schedule and expects that URL to always reflect current data —
 * that requires a server that actually has the ticket data, which this app doesn't have yet
 * (everything lives in the browser's localStorage; see CrossTabSync.tsx and the surrounding
 * conversation about needing a real backend). Once there's a backend, the natural next step is
 * an API route like /api/calendar/[token].ics that calls buildICS() against a live query
 * instead of a client-side snapshot, and pointing iOS Settings > Calendar > Add Subscription at
 * it — the format produced here doesn't need to change for that, just where it's called from.
 */

export interface IcsEvent {
  uid: string;
  /** ISO date (YYYY-MM-DD) — all events here are all-day, single-day. */
  date: string;
  summary: string;
  description?: string;
  url?: string;
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** RFC 5545 §3.1: lines longer than 75 octets get folded with CRLF + a leading space. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let result = "";
  let rest = line;
  while (rest.length > 75) {
    result += rest.slice(0, 75) + "\r\n ";
    rest = rest.slice(75);
  }
  return result + rest;
}

function dateToICSDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function addDaysICSDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function buildICS(events: IcsEvent[], calendarName: string): string {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Roll Off Tracker Pro//Dispatch Calendar//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateToICSDate(ev.date)}`,
      `DTEND;VALUE=DATE:${addDaysICSDate(ev.date, 1)}`,
      `SUMMARY:${escapeText(ev.summary)}`
    );
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.url) lines.push(`URL:${ev.url}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
