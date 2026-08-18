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

/** Whole days elapsed since the box was dropped — null if it hasn't been dropped yet. */
export function daysOnSite(ticket: Ticket, now: Date = new Date()): number | null {
  if (!ticket.drop_date) return null;
  const dropped = new Date(ticket.drop_date);
  return Math.floor((now.getTime() - dropped.getTime()) / DAY_MS);
}

/** Whole days the box actually sat on site, drop to pickup — null unless both dates are set. */
export function totalDaysOnSite(ticket: Ticket): number | null {
  if (!ticket.drop_date || !ticket.pickup_date) return null;
  const dropped = new Date(ticket.drop_date);
  const pickedUp = new Date(ticket.pickup_date);
  return Math.max(0, Math.round((pickedUp.getTime() - dropped.getTime()) / DAY_MS));
}

export type TurnaroundTag = "short" | "good" | "overtime";

/**
 * How a completed job's turnaround compares to its 14/30-day allowance:
 * - "overtime": picked up after the allowance ran out
 * - "short": picked up at or before half the allowance
 * - "good": picked up within the allowance, past the halfway point
 * Live loads have no allowance (timerLengthDays is null) so there's nothing to compare — null.
 */
export function classifyTurnaround(ticket: Ticket): TurnaroundTag | null {
  const total = totalDaysOnSite(ticket);
  const limit = timerLengthDays(ticket);
  if (total === null || limit === null) return null;
  if (total > limit) return "overtime";
  if (total <= limit / 2) return "short";
  return "good";
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
