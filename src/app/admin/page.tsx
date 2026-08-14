"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore, useCurrentAccount } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { Dumpster, DumpsterStatus, Ticket, TicketStatus, TicketType } from "@/lib/types";
import { ticketCustomer } from "@/lib/selectors";
import { TICKET_LABELS } from "@/components/StatusBadge";
import { TICKET_TYPE_LABELS } from "@/lib/ticketType";

const TABS = ["Dumpsters", "Tickets", "Customers", "Metrics"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  return (
    <Hydrated>
      <AdminContent />
    </Hydrated>
  );
}

function AdminContent() {
  const account = useCurrentAccount();
  const [tab, setTab] = useState<Tab>("Dumpsters");

  if (account?.role !== "admin") {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-500">
          Admin access only. Log in as <strong>Robert</strong> (Admin) in the top-right to view
          this page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
        <p className="text-sm text-slate-500">Direct, Excel-like access to the underlying data.</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Dumpsters" && <DumpstersTable />}
      {tab === "Tickets" && <TicketsTable />}
      {tab === "Customers" && <CustomersTable />}
      {tab === "Metrics" && <MetricsPanel />}
    </div>
  );
}

const cellInput =
  "w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-slate-200 focus:border-slate-400 focus:bg-white focus:outline-none";

function DumpstersTable() {
  const dumpsters = useStore((s) => s.dumpsters);
  const addDumpster = useStore((s) => s.addDumpster);
  const updateDumpster = useStore((s) => s.updateDumpster);
  const removeDumpster = useStore((s) => s.removeDumpster);

  const [newId, setNewId] = useState("");
  const [newSize, setNewSize] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newId.trim() || !newSize.trim()) return;
    const dumpster: Dumpster = { id: newId.trim(), size_yards: newSize.trim(), status: "idle" };
    addDumpster(dumpster);
    setNewId("");
    setNewSize("");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Box #</th>
              <th className="px-4 py-2">Size (yd)</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dumpsters
              .slice()
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-1.5 font-medium text-slate-900">#{d.id}</td>
                  <td className="px-4 py-1.5">
                    <input
                      value={d.size_yards}
                      onChange={(e) => updateDumpster(d.id, { size_yards: e.target.value })}
                      className={cellInput}
                    />
                  </td>
                  <td className="px-4 py-1.5">
                    <select
                      value={d.status}
                      onChange={(e) =>
                        updateDumpster(d.id, { status: e.target.value as DumpsterStatus })
                      }
                      className={cellInput}
                    >
                      <option value="idle">Idle</option>
                      <option value="in-service">In Service</option>
                      <option value="out-of-service">Out of Service</option>
                    </select>
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    <button
                      onClick={() => removeDumpster(d.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-3">
        <input
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          placeholder="Box # (e.g. 1099)"
          className="w-40 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          value={newSize}
          onChange={(e) => setNewSize(e.target.value)}
          placeholder="Size (yd)"
          className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Add Dumpster
        </button>
      </form>
    </div>
  );
}

const STATUS_OPTIONS: TicketStatus[] = [
  "draft",
  "order-taken",
  "dropped",
  "ready-to-invoice",
  "invoiced",
  "archived",
];

function TicketsTable() {
  const tickets = useStore((s) => s.tickets);
  const sites = useStore((s) => s.sites);
  const customers = useStore((s) => s.customers);
  const updateTicketFields = useStore((s) => s.updateTicketFields);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <p className="text-sm text-slate-500">{tickets.length} tickets total.</p>
        <Link
          href="/tickets/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Add Ticket
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Box</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Invoice #</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((t: Ticket) => {
              const { customer } = ticketCustomer(t, sites, customers);
              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-1.5 font-medium text-slate-900">
                    {customer?.company_name ?? "—"}
                  </td>
                  <td className="px-4 py-1.5 text-slate-600">
                    {t.dumpster_id ? `#${t.dumpster_id}` : "—"}
                  </td>
                  <td className="px-4 py-1.5">
                    <select
                      value={t.status}
                      onChange={(e) =>
                        updateTicketFields(t.id, { status: e.target.value as TicketStatus })
                      }
                      className={cellInput}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-1.5">
                    <input
                      value={t.invoice_number}
                      onChange={(e) => updateTicketFields(t.id, { invoice_number: e.target.value })}
                      className={cellInput}
                    />
                  </td>
                  <td className="px-4 py-1.5">
                    <input
                      value={t.invoiceable_amount}
                      onChange={(e) =>
                        updateTicketFields(t.id, { invoiceable_amount: e.target.value })
                      }
                      className={cellInput}
                    />
                  </td>
                  <td className="px-4 py-1.5">
                    <input
                      value={t.notes}
                      onChange={(e) => updateTicketFields(t.id, { notes: e.target.value })}
                      className={cellInput}
                    />
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

function CustomersTable() {
  const customers = useStore((s) => s.customers);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900">
                  <Link href={`/customers/${c.id}`} className="hover:underline">
                    {c.company_name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{c.contact_name}</td>
                <td className="px-4 py-2 text-slate-600">{c.phone}</td>
                <td className="px-4 py-2 text-slate-600">{c.email}</td>
                <td className="px-4 py-2 text-slate-600">
                  {c.address}, {c.city} {c.state}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricsPanel() {
  const tickets = useStore((s) => s.tickets);
  const dumpsters = useStore((s) => s.dumpsters);

  const usageByDumpster = new Map<string, number>();
  tickets.forEach((t) => {
    if (!t.dumpster_id) return;
    usageByDumpster.set(t.dumpster_id, (usageByDumpster.get(t.dumpster_id) ?? 0) + 1);
  });
  const topDumpsters = Array.from(usageByDumpster.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxDumpsterUsage = topDumpsters[0]?.[1] ?? 0;

  const sizeCounts = new Map<string, number>();
  tickets.forEach((t) => {
    if (!t.box_size) return;
    sizeCounts.set(t.box_size, (sizeCounts.get(t.box_size) ?? 0) + 1);
  });
  const sortedSizes = Array.from(sizeCounts.entries()).sort((a, b) => b[1] - a[1]);
  const maxSizeCount = sortedSizes[0]?.[1] ?? 0;

  const typeCounts: Record<TicketType, number> = { residential: 0, commercial: 0, "live-load": 0 };
  tickets.forEach((t) => {
    typeCounts[t.type] = (typeCounts[t.type] ?? 0) + 1;
  });

  const statusCounts = new Map<TicketStatus, number>();
  tickets.forEach((t) => statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1));

  const totalRevenue = tickets
    .filter((t) => t.invoiced)
    .reduce((sum, t) => sum + (parseFloat(t.invoiceable_amount) || 0), 0);

  const inServiceCount = dumpsters.filter((d) => d.status === "in-service").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total Tickets" value={tickets.length} />
        <StatTile label="Fleet Size" value={dumpsters.length} />
        <StatTile label="Boxes In Service" value={inServiceCount} />
        <StatTile label="Invoiced Revenue" value={`$${totalRevenue.toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MetricCard title="Most-Used Dumpsters">
          {topDumpsters.length === 0 ? (
            <p className="text-sm text-slate-400">No ticket history yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topDumpsters.map(([id, count]) => (
                <BarRow key={id} label={`#${id}`} count={count} max={maxDumpsterUsage} />
              ))}
            </div>
          )}
        </MetricCard>

        <MetricCard title="Most Requested Box Sizes">
          {sortedSizes.length === 0 ? (
            <p className="text-sm text-slate-400">No ticket history yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedSizes.map(([size, count]) => (
                <BarRow key={size} label={`${size} yd`} count={count} max={maxSizeCount} />
              ))}
            </div>
          )}
        </MetricCard>

        <MetricCard title="Ticket Types">
          <div className="flex flex-col gap-2">
            {(Object.keys(typeCounts) as TicketType[]).map((type) => (
              <BarRow
                key={type}
                label={TICKET_TYPE_LABELS[type]}
                count={typeCounts[type]}
                max={tickets.length || 1}
              />
            ))}
          </div>
        </MetricCard>

        <MetricCard title="Tickets by Status">
          <div className="flex flex-col gap-2">
            {Array.from(statusCounts.entries()).map(([status, count]) => (
              <BarRow key={status} label={TICKET_LABELS[status]} count={count} max={tickets.length || 1} />
            ))}
          </div>
        </MetricCard>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MetricCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-sm font-medium text-slate-700">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm text-slate-500">{count}</span>
    </div>
  );
}
