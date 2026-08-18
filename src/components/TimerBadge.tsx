"use client";

import { Ticket } from "@/lib/types";
import { classifyTurnaround, daysRemaining, timerLengthDays, totalDaysOnSite, TurnaroundTag } from "@/lib/timer";
import { useOffsetNow } from "@/lib/store";

const TURNAROUND_STYLE: Record<TurnaroundTag, string> = {
  short: "bg-sky-100 text-sky-800 ring-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-sky-700",
  good: "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700",
  overtime: "bg-red-100 text-red-800 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700",
};

const TURNAROUND_LABEL: Record<TurnaroundTag, string> = {
  short: "Short",
  good: "Good",
  overtime: "Overtime",
};

export function TimerBadge({ ticket }: { ticket: Ticket }) {
  const now = useOffsetNow();

  if (ticket.status === "archived") {
    const total = totalDaysOnSite(ticket);
    if (total === null) return null;
    const tag = classifyTurnaround(ticket);
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
          {total}d on site
        </span>
        {tag && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TURNAROUND_STYLE[tag]}`}
            title="Compared to the 14/30-day allowance for this ticket type"
          >
            {TURNAROUND_LABEL[tag]}
          </span>
        )}
      </span>
    );
  }

  const remaining = daysRemaining(ticket, now);
  if (remaining === null) return null;

  const overdue = remaining < 0;
  const soon = !overdue && remaining <= 3;

  const style = overdue
    ? "bg-red-100 text-red-800 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700"
    : soon
    ? "bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700"
    : "bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600";

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
