"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { TicketStatusBadge } from "@/components/StatusBadge";
import { TimerBadge } from "@/components/TimerBadge";
import { daysRemaining } from "@/lib/timer";
import { ticketCustomer } from "@/lib/selectors";
import { Customer, Site, Ticket } from "@/lib/types";

export default function DashboardPage() {
  return (
    <Hydrated>
      <DashboardContent />
    </Hydrated>
  );
}

function DashboardContent() {
  const tickets = useStore((s) => s.tickets);
  const sites = useStore((s) => s.sites);
  const customers = useStore((s) => s.customers);

  const active = tickets.filter((t) => t.status !== "archived");
  const dropped = tickets
    .filter((t) => t.status === "dropped")
    .sort((a, b) => (daysRemaining(a) ?? 0) - (daysRemaining(b) ?? 0));
  const overdueCount = dropped.filter((t) => (daysRemaining(t) ?? 0) < 0).length;
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active Tickets" value={active.length} />
        <StatTile label="Timers Running" value={dropped.length} />
        <StatTile label="Overdue" value={overdueCount} tone={overdueCount > 0 ? "danger" : "default"} />
        <StatTile label="Awaiting Invoice" value={readyToInvoice.length} />
      </div>

      <Section title="Active Timers" subtitle="Sorted by days remaining — overdue first.">
        {dropped.length === 0 ? (
          <EmptyRow text="No boxes currently in the field." />
        ) : (
          <TicketTable
            tickets={dropped}
            sites={sites}
            customers={customers}
            showTimer
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
}: {
  tickets: Ticket[];
  sites: Site[];
  customers: Customer[];
  showTimer?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Site</th>
              <th className="px-4 py-2">Box</th>
              <th className="px-4 py-2">Status</th>
              {showTimer && <th className="px-4 py-2">Timer</th>}
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => {
              const { site, customer } = ticketCustomer(ticket, sites, customers);
              return (
                <tr key={ticket.id} className="hover:bg-slate-50">
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
                  {showTimer && (
                    <td className="px-4 py-3">
                      <TimerBadge ticket={ticket} />
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
