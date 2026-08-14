"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore, useCurrentAccount } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { TicketStatusBadge } from "@/components/StatusBadge";
import { TimerBadge } from "@/components/TimerBadge";
import { ticketCustomer } from "@/lib/selectors";
import { TICKET_TYPE_LABELS } from "@/lib/ticketType";
import { TicketStatus } from "@/lib/types";

const BASE_FILTERS: { label: string; value: TicketStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Order Taken", value: "order-taken" },
  { label: "Box Dropped", value: "dropped" },
  { label: "Ready to Invoice", value: "ready-to-invoice" },
];

const ARCHIVED_FILTER = { label: "Archived", value: "archived" as const };

export default function TicketsPage() {
  return (
    <Hydrated>
      <TicketsContent />
    </Hydrated>
  );
}

function TicketsContent() {
  const router = useRouter();
  const allTickets = useStore((s) => s.tickets);
  const sites = useStore((s) => s.sites);
  const customers = useStore((s) => s.customers);
  const account = useCurrentAccount();
  const isAdmin = account?.role === "admin";
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [query, setQuery] = useState("");

  const tickets = useMemo(
    () => (isAdmin ? allTickets : allTickets.filter((t) => t.status !== "archived")),
    [allTickets, isAdmin]
  );
  const filters = isAdmin ? [...BASE_FILTERS, ARCHIVED_FILTER] : BASE_FILTERS;

  const filtered = useMemo(() => {
    return tickets
      .filter((t) => filter === "all" || t.status === filter)
      .filter((t) => {
        if (!query.trim()) return true;
        const { site, customer } = ticketCustomer(t, sites, customers);
        const haystack = `${customer?.company_name ?? ""} ${site?.site_address ?? ""} ${
          t.dumpster_id ?? ""
        }`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      })
      .sort((a, b) => (a.date_of_order < b.date_of_order ? 1 : -1));
  }, [tickets, sites, customers, filter, query]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
        <Link
          href="/tickets/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + New Ticket
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer, site, box #..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Order Date</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Site</th>
                <th className="px-4 py-2">Box</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Timer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ticket) => {
                const { site, customer } = ticketCustomer(ticket, sites, customers);
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-600">{ticket.date_of_order}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {customer?.company_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{site?.site_address ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {ticket.dumpster_id ? `#${ticket.dumpster_id}` : "—"} · {ticket.box_size}yd
                    </td>
                    <td className="px-4 py-3 text-slate-600">{TICKET_TYPE_LABELS[ticket.type]}</td>
                    <td className="px-4 py-3">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3">
                      <TimerBadge ticket={ticket} />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No tickets match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
