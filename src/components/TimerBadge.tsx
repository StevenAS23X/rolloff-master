"use client";

import { Ticket } from "@/lib/types";
import { daysRemaining, timerLengthDays } from "@/lib/timer";
import { useOffsetNow } from "@/lib/store";

export function TimerBadge({ ticket }: { ticket: Ticket }) {
  const now = useOffsetNow();
  const remaining = daysRemaining(ticket, now);
  if (remaining === null) return null;

  const overdue = remaining < 0;
  const soon = !overdue && remaining <= 3;

  const style = overdue
    ? "bg-red-100 text-red-800 ring-red-300"
    : soon
    ? "bg-amber-100 text-amber-800 ring-amber-300"
    : "bg-slate-100 text-slate-700 ring-slate-300";

  const label = overdue
    ? `${Math.abs(remaining)}d overdue`
    : remaining === 0
    ? "Due today"
    : `${remaining}d left`;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${style}`}
      title={`${timerLengthDays(ticket)}-day timer (${ticket.type})`}
    >
      {label}
    </span>
  );
}
