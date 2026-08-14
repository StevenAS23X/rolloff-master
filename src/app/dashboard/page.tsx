"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore, useOffsetNow } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { TicketStatusBadge } from "@/components/StatusBadge";
import { TimerBadge } from "@/components/TimerBadge";
import { daysOnSite, daysRemaining } from "@/lib/timer";
import { ticketCustomer } from "@/lib/selectors";
import { Customer, Site, Ticket } from "@/lib/types";
import { TimeAccelerator } from "@/components/TimeAccelerator";

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
  const now = useOffsetNow();
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
        site?.site_address ?? ""
      } ${t.dumpster_id ?? ""}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [allTickets, sites, customers, query, sizeFilter]);

  const active = tickets.filter((t) => t.status !== "archived");
  const min = minDaysOnSite.trim() === "" ? null : Number(minDaysOnSite);
  const max = maxDaysOnSite.trim() === "" ? null : Number(maxDaysOnSite);
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispatch Dashboard</h1>
          <p className="text-sm text-slate-500">Live view of every open ticket and its timer.</p>
        </div>
        <Link
          href="/tickets/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + New Ticket
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search box # or address..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={sizeFilter}
          onChange={(e) => setSizeFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          <option value="all">All Sizes</option>
          {sizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} yd
            </option>
          ))}
        </select>
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
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Days on site — min</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={minDaysOnSite}
              onChange={(e) => setMinDaysOnSite(e.target.value)}
              placeholder="e.g. 13"
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Days on site — max</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={maxDaysOnSite}
              onChange={(e) => setMaxDaysOnSite(e.target.value)}
              placeholder="e.g. 13"
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          {(minDaysOnSite || maxDaysOnSite) && (
            <button
              type="button"
              onClick={() => {
                setMinDaysOnSite("");
                setMaxDaysOnSite("");
              }}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Clear
            </button>
          )}
        </div>
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

      <TimeAccelerator />
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "danger" && value > 0 ? "text-red-600" : "text-slate-900"}`}>
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
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-400">
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Table layout for wider screens — a row of columns doesn't have room to wrap on a phone. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Site</th>
              <th className="px-4 py-2">Box</th>
              <th className="px-4 py-2">Status</th>
              {showDaysOnSite && <th className="px-4 py-2">Days on Site</th>}
              {showTimer && <th className="px-4 py-2">Timer</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => {
              const { site, customer } = ticketCustomer(ticket, sites, customers);
              return (
                <tr
                  key={ticket.id}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {customer?.company_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{site?.site_address ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {ticket.dumpster_id ? `#${ticket.dumpster_id}` : "—"} · {ticket.box_size}yd
                  </td>
                  <td className="px-4 py-3">
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  {showDaysOnSite && (
                    <td className="px-4 py-3 text-slate-600">
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
      <div className="divide-y divide-slate-100 sm:hidden">
        {tickets.map((ticket) => {
          const { site, customer } = ticketCustomer(ticket, sites, customers);
          return (
            <button
              key={ticket.id}
              onClick={() => router.push(`/tickets/${ticket.id}`)}
              className="flex w-full flex-col gap-1.5 px-4 py-3 text-left hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-slate-900">{customer?.company_name ?? "—"}</span>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <div className="text-sm text-slate-600">{site?.site_address ?? "—"}</div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span>
                  {ticket.dumpster_id ? `#${ticket.dumpster_id}` : "—"} · {ticket.box_size}yd
                </span>
                {showDaysOnSite && now && daysOnSite(ticket, now) !== null && (
                  <span>{daysOnSite(ticket, now)}d on site</span>
                )}
                {showTimer && <TimerBadge ticket={ticket} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
