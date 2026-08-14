import { Ticket } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function timerLengthDays(ticket: Ticket): number | null {
  if (ticket.type === "residential") return 14;
  if (ticket.type === "commercial") return 30;
  return null; // Live loads turn around same-day — no multi-day timer (details TBD).
}

export function timerDueDate(ticket: Ticket): Date | null {
  if (!ticket.drop_date) return null;
  const lengthDays = timerLengthDays(ticket);
  if (lengthDays === null) return null;
  const dropped = new Date(ticket.drop_date);
  return new Date(dropped.getTime() + lengthDays * DAY_MS);
}

export function daysRemaining(ticket: Ticket, now: Date = new Date()): number | null {
  const due = timerDueDate(ticket);
  if (!due) return null;
  return Math.ceil((due.getTime() - now.getTime()) / DAY_MS);
}

export function isTimerActive(ticket: Ticket): boolean {
  return ticket.status === "dropped";
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
