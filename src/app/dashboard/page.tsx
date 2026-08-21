"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore, useOffsetNow } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { TicketStatusBadge } from "@/components/StatusBadge";
import { TimerBadge } from "@/components/TimerBadge";
import { daysOnSite, daysRemaining, timerDueDate, todayISO } from "@/lib/timer";
import { ticketCustomer } from "@/lib/selectors";
import { Customer, Site, Ticket } from "@/lib/types";
import { TimeAccelerator } from "@/components/TimeAccelerator";
import { MONTH_LABELS, dateToISODate, formatDisplayDate, monthGridCells, parseISODateLocal } from "@/lib/calendarUtil";
import { buildICS, IcsEvent } from "@/lib/ics";

export default function DashboardPage() {
  return (
    <Hydrated>
      <DashboardContent />
    </Hydrated>
  );
}

function DashboardContent() {
  const allTickets = useStore((s) => s.tickets);
  const sites = useStore((s) => s.sites);
  const customers = useStore((s) => s.customers);
  const dumpsters = useStore((s) => s.dumpsters);
  const showCalendarTab = useStore((s) => s.featureFlags.showCalendarTab);
  const showDaysOnSiteFilter = useStore((s) => s.featureFlags.showDaysOnSiteFilter);
  const now = useOffsetNow();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [query, setQuery] = useState("");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [minDaysOnSite, setMinDaysOnSite] = useState("");
  const [maxDaysOnSite, setMaxDaysOnSite] = useState("");

  const sizeOptions = useMemo(() => {
    const sizes = new Set(dumpsters.map((d) => d.size_yards));
    allTickets.forEach((t) => sizes.add(t.box_size));
    return Array.from(sizes).sort((a, b) => Number(a) - Number(b));
  }, [dumpsters, allTickets]);

  const tickets = useMemo(() => {
    return allTickets.filter((t) => {
      if (sizeFilter !== "all" && t.box_size !== sizeFilter) return false;
      if (!query.trim()) return true;
      const { site, customer } = ticketCustomer(t, sites, customers);
      const haystack = `${customer?.company_name ?? ""} ${customer?.address ?? ""} ${
        customer?.city ?? ""
      } ${customer?.zip ?? ""} ${site?.site_address ?? ""} ${site?.site_city ?? ""} ${
        site?.site_zip ?? ""
      } ${t.dumpster_id ?? ""}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase().replace(/#/g, ""));
    });
  }, [allTickets, sites, customers, query, sizeFilter]);

  const active = tickets.filter((t) => t.status !== "archived");
  const min = !showDaysOnSiteFilter || minDaysOnSite.trim() === "" ? null : Number(minDaysOnSite);
  const max = !showDaysOnSiteFilter || maxDaysOnSite.trim() === "" ? null : Number(maxDaysOnSite);
  const dropped = tickets
    .filter((t) => t.status === "dropped")
    .filter((t) => {
      if (min === null && max === null) return true;
      const days = daysOnSite(t, now);
      if (days === null) return false;
      if (min !== null && days < min) return false;
      if (max !== null && days > max) return false;
      return true;
    })
    .sort((a, b) => (daysRemaining(a, now) ?? 0) - (daysRemaining(b, now) ?? 0));
  const overdueCount = dropped.filter((t) => (daysRemaining(t, now) ?? 0) < 0).length;
  const drafts = tickets.filter((t) => t.status === "draft");
  const orderTaken = tickets.filter((t) => t.status === "order-taken");
  const readyToInvoice = tickets.filter((t) => t.status === "ready-to-invoice");
  const activeLiveLoads = allTickets.filter(
    (t) => t.type === "live-load" && t.status === "order-taken" && t.requested_drop_date === todayISO()
  );

  return (
    <div className="flex flex-col gap-8">
      {activeLiveLoads.length > 0 && <ActiveLiveLoadsBanner tickets={activeLiveLoads} sites={sites} customers={customers} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dispatch Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Live view of every open ticket and its timer.</p>
        </div>
        <Link
          href="/tickets/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + New Ticket
        </Link>
      </div>

      {showCalendarTab && (
        <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 w-fit">
          {(["list", "calendar"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                view === v ? "bg-slate-900 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {view === "calendar" && showCalendarTab ? (
        <DispatchCalendar tickets={allTickets} sites={sites} customers={customers} now={now} />
      ) : (
        <>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search box # or address..."
            className="min-w-[220px] flex-1 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Sizes</option>
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} yd
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">Search and size apply to every list on this page.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active Tickets" value={active.length} />
        <StatTile label="Timers Running" value={dropped.length} />
        <StatTile label="Overdue" value={overdueCount} tone={overdueCount > 0 ? "danger" : "default"} />
        <StatTile label="Awaiting Invoice" value={readyToInvoice.length} />
      </div>

      {drafts.length > 0 && (
        <Section title="Drafts" subtitle="Started but not finished yet — safe to resume anytime.">
          <TicketTable tickets={drafts} sites={sites} customers={customers} />
        </Section>
      )}

      <Section title="Active Timers" subtitle="Sorted by days remaining — overdue first.">
        {showDaysOnSiteFilter && (
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Days on site — min</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={minDaysOnSite}
                onChange={(e) => setMinDaysOnSite(e.target.value)}
                placeholder="e.g. 13"
                className="w-24 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Days on site — max</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={maxDaysOnSite}
                onChange={(e) => setMaxDaysOnSite(e.target.value)}
                placeholder="e.g. 13"
                className="w-24 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </label>
            <span className="mb-2 text-xs text-slate-400 dark:text-slate-500">
              Narrows this list only, by days since drop-off — leave blank for no limit, or set
              both to the same number for an exact match. Not the same as &quot;days left&quot; on
              the timer badge.
            </span>
            {(minDaysOnSite || maxDaysOnSite) && (
              <button
                type="button"
                onClick={() => {
                  setMinDaysOnSite("");
                  setMaxDaysOnSite("");
                }}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Clear
              </button>
            )}
          </div>
        )}
        {dropped.length === 0 ? (
          <EmptyRow
            text={
              min !== null || max !== null
                ? "No boxes on site match that days range."
                : "No boxes currently in the field."
            }
          />
        ) : (
          <TicketTable
            tickets={dropped}
            sites={sites}
            customers={customers}
            showTimer
            showDaysOnSite
            now={now}
          />
        )}
      </Section>

      <Section title="Awaiting Drop-Off" subtitle="Orders taken but the box hasn't been placed yet.">
        {orderTaken.length === 0 ? (
          <EmptyRow text="Nothing waiting on drop-off." />
        ) : (
          <TicketTable tickets={orderTaken} sites={sites} customers={customers} />
        )}
      </Section>

      <Section title="Ready to Invoice" subtitle="Picked up, waiting on billing.">
        {readyToInvoice.length === 0 ? (
          <EmptyRow text="Nothing waiting on invoicing." />
        ) : (
          <TicketTable tickets={readyToInvoice} sites={sites} customers={customers} />
        )}
      </Section>
        </>
      )}

      <TimeAccelerator />
    </div>
  );
}

function ActiveLiveLoadsBanner({
  tickets,
  sites,
  customers,
}: {
  tickets: Ticket[];
  sites: Site[];
  customers: Customer[];
}) {
  const router = useRouter();
  return (
    <div className="rounded-lg border-2 border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30 p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-400">
        Live Load In Progress
      </p>
      <div className="flex flex-col gap-2">
        {tickets.map((ticket) => {
          const { site, customer } = ticketCustomer(ticket, sites, customers);
          return (
            <button
              key={ticket.id}
              onClick={() => router.push(`/tickets/${ticket.id}`)}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md bg-white dark:bg-slate-900 px-3 py-2 text-left shadow-sm hover:bg-sky-100/60 dark:hover:bg-sky-900/30"
            >
              <span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{customer?.company_name ?? "—"}</span>{" "}
                <span className="text-slate-500 dark:text-slate-400">— {site?.site_address ?? "—"}</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {ticket.live_load_count ? `~${ticket.live_load_count} loads` : "Loads TBD"} · Open →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "danger" && value > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
      {text}
    </div>
  );
}

function TicketTable({
  tickets,
  sites,
  customers,
  showTimer = false,
  showDaysOnSite = false,
  now,
}: {
  tickets: Ticket[];
  sites: Site[];
  customers: Customer[];
  showTimer?: boolean;
  showDaysOnSite?: boolean;
  now?: Date;
}) {
  const router = useRouter();
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      {/* Table layout for wider screens — a row of columns doesn't have room to wrap on a phone. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Site</th>
              <th className="px-4 py-2">Box</th>
              <th className="px-4 py-2">Status</th>
              {showDaysOnSite && <th className="px-4 py-2">Days on Site</th>}
              {showTimer && <th className="px-4 py-2">Timer</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {tickets.map((ticket) => {
              const { site, customer } = ticketCustomer(ticket, sites, customers);
              const hasFees = ticket.additionalFees.length > 0;
              return (
                <tr
                  key={ticket.id}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  className={`cursor-pointer ${
                    hasFees
                      ? "bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/30 dark:hover:bg-pink-900/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                  title={hasFees ? "This ticket has additional fees" : undefined}
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {customer?.company_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{site?.site_address ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {ticket.dumpster_id ? `#${ticket.dumpster_id}` : "—"} · {ticket.box_size}yd
                    {hasFees && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-pink-200 dark:bg-pink-900/50 px-2 py-0.5 text-xs font-medium text-pink-800 dark:text-pink-300">
                        + Fees
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  {showDaysOnSite && (
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {now && daysOnSite(ticket, now) !== null ? `${daysOnSite(ticket, now)}d` : "—"}
                    </td>
                  )}
                  {showTimer && (
                    <td className="px-4 py-3">
                      <TimerBadge ticket={ticket} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stacked card layout for phones — nothing to clip or scroll sideways to see. */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
        {tickets.map((ticket) => {
          const { site, customer } = ticketCustomer(ticket, sites, customers);
          const hasFees = ticket.additionalFees.length > 0;
          return (
            <button
              key={ticket.id}
              onClick={() => router.push(`/tickets/${ticket.id}`)}
              className={`flex w-full flex-col gap-1.5 px-4 py-3 text-left ${
                hasFees
                  ? "bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/30 dark:hover:bg-pink-900/30"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100">{customer?.company_name ?? "—"}</span>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{site?.site_address ?? "—"}</div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                <span>
                  {ticket.dumpster_id ? `#${ticket.dumpster_id}` : "—"} · {ticket.box_size}yd
                </span>
                {showDaysOnSite && now && daysOnSite(ticket, now) !== null && (
                  <span>{daysOnSite(ticket, now)}d on site</span>
                )}
                {showTimer && <TimerBadge ticket={ticket} />}
                {hasFees && (
                  <span className="inline-flex items-center rounded-full bg-pink-200 dark:bg-pink-900/50 px-2 py-0.5 text-xs font-medium text-pink-800 dark:text-pink-300">
                    + Fees
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface CalendarEvent {
  type: "requested-drop" | "pickup-due" | "picked-up";
  ticket: Ticket;
}

const EVENT_LABEL: Record<CalendarEvent["type"], string> = {
  "requested-drop": "Requested Drop",
  "pickup-due": "Pickup Due",
  "picked-up": "Picked Up",
};

const EVENT_DOT_COLOR: Record<CalendarEvent["type"], string> = {
  "requested-drop": "bg-sky-500",
  "pickup-due": "bg-amber-500",
  "picked-up": "bg-emerald-500",
};

const EVENT_BADGE_STYLE: Record<CalendarEvent["type"], string> = {
  "requested-drop": "bg-sky-100 text-sky-800 ring-sky-300",
  "pickup-due": "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 ring-amber-300 dark:ring-amber-700",
  "picked-up": "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 ring-emerald-300 dark:ring-emerald-700",
};

function DispatchCalendar({
  tickets,
  sites,
  customers,
  now,
}: {
  tickets: Ticket[];
  sites: Site[];
  customers: Customer[];
  now: Date;
}) {
  const router = useRouter();
  const todayIso = dateToISODate(now);
  const [viewMonth, setViewMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayIso);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const add = (date: string | null, ev: CalendarEvent) => {
      if (!date) return;
      const list = map.get(date) ?? [];
      list.push(ev);
      map.set(date, list);
    };
    for (const t of tickets) {
      if (t.status === "order-taken" && t.requested_drop_date) {
        add(t.requested_drop_date, { type: "requested-drop", ticket: t });
      }
      if (t.status === "dropped") {
        const due = timerDueDate(t);
        if (due) add(dateToISODate(due), { type: "pickup-due", ticket: t });
      }
      if (t.pickup_date) {
        add(t.pickup_date, { type: "picked-up", ticket: t });
      }
    }
    return map;
  }, [tickets]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    const current = now.getFullYear();
    for (let y = current - 3; y <= current + 3; y++) years.add(y);
    years.add(viewMonth.getFullYear());
    for (const dateKey of eventsByDate.keys()) years.add(Number(dateKey.slice(0, 4)));
    return Array.from(years).sort((a, b) => a - b);
  }, [now, viewMonth, eventsByDate]);

  const cells = monthGridCells(viewMonth);
  const selectedDateObj = parseISODateLocal(selectedDate);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  function handleExport() {
    const icsEvents: IcsEvent[] = [];
    for (const [date, evs] of eventsByDate) {
      for (const ev of evs) {
        const { site, customer } = ticketCustomer(ev.ticket, sites, customers);
        icsEvents.push({
          uid: `${ev.ticket.id}-${ev.type}@rolloff-tracker`,
          date,
          summary: `${EVENT_LABEL[ev.type]} — ${customer?.company_name ?? "Unknown customer"}`,
          description: [site?.site_address, ev.ticket.dumpster_id ? `Box #${ev.ticket.dumpster_id}` : null]
            .filter(Boolean)
            .join(" · "),
        });
      }
    }
    const ics = buildICS(icsEvents, "Roll Off Tracker — Dispatch");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rolloff-dispatch-calendar.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          {(Object.keys(EVENT_LABEL) as CalendarEvent["type"][]).map((type) => (
            <span key={type} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${EVENT_DOT_COLOR[type]}`} />
              {EVENT_LABEL[type]}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          title="Downloads a snapshot .ics file — open it in Calendar and choose 'Add All' to import. This is a one-time import, not a live-syncing subscription."
        >
          Export Calendar (.ics)
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
            className="rounded px-2 py-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ‹
          </button>
          <div className="flex items-center gap-1.5">
            <select
              value={viewMonth.getMonth()}
              onChange={(e) => setViewMonth(new Date(viewMonth.getFullYear(), Number(e.target.value), 1))}
              className="rounded-md border border-slate-200 dark:border-slate-800 px-2 py-1 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {MONTH_LABELS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={viewMonth.getFullYear()}
              onChange={(e) => setViewMonth(new Date(Number(e.target.value), viewMonth.getMonth(), 1))}
              className="rounded-md border border-slate-200 dark:border-slate-800 px-2 py-1 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            className="rounded px-2 py-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
          {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
            <span key={i} className="py-1">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <span key={i} />;
            const iso = dateToISODate(day);
            const events = eventsByDate.get(iso) ?? [];
            const isToday = iso === todayIso;
            const isSelected = iso === selectedDate;
            const dotTypes = Array.from(new Set(events.map((e) => e.type)));
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={`flex touch-manipulation flex-col items-center gap-0.5 rounded-md py-1.5 text-sm ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : isToday
                    ? "font-semibold text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{day.getDate()}</span>
                <span className="flex h-1.5 gap-0.5">
                  {dotTypes.slice(0, 3).map((type) => (
                    <span key={type} className={`h-1.5 w-1.5 rounded-full ${EVENT_DOT_COLOR[type]}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {selectedDateObj ? formatDisplayDate(selectedDateObj) : selectedDate}
        </h3>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Nothing scheduled this day.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {selectedEvents.map((ev, i) => {
              const { site, customer } = ticketCustomer(ev.ticket, sites, customers);
              return (
                <li
                  key={i}
                  onClick={() => router.push(`/tickets/${ev.ticket.id}`)}
                  className="flex cursor-pointer items-center justify-between gap-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{customer?.company_name ?? "—"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {site?.site_address ?? "—"}
                      {ev.ticket.dumpster_id ? ` · #${ev.ticket.dumpster_id}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${EVENT_BADGE_STYLE[ev.type]}`}
                  >
                    {EVENT_LABEL[ev.type]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
