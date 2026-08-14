"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { DumpsterStatusBadge } from "@/components/StatusBadge";
import { activeTicketForDumpster, ticketCustomer } from "@/lib/selectors";
import { DumpsterStatus } from "@/lib/types";

const FILTERS: { label: string; value: DumpsterStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Idle", value: "idle" },
  { label: "In Service", value: "in-service" },
];

export default function DumpstersPage() {
  return (
    <Hydrated>
      <DumpstersContent />
    </Hydrated>
  );
}

function DumpstersContent() {
  const dumpsters = useStore((s) => s.dumpsters);
  const tickets = useStore((s) => s.tickets);
  const sites = useStore((s) => s.sites);
  const customers = useStore((s) => s.customers);
  const [filter, setFilter] = useState<DumpsterStatus | "all">("all");
  const [query, setQuery] = useState("");

  const idleCount = dumpsters.filter((d) => d.status === "idle").length;
  const inServiceCount = dumpsters.filter((d) => d.status === "in-service").length;

  const filtered = useMemo(() => {
    return dumpsters
      .filter((d) => filter === "all" || d.status === filter)
      .filter((d) => !query.trim() || d.id.includes(query.trim()))
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [dumpsters, filter, query]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dumpsters</h1>
        <p className="text-sm text-slate-500">
          {dumpsters.length} boxes total — {idleCount} idle, {inServiceCount} in service.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search box #..."
          className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Box #</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Current Job</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => {
                const ticket = d.status === "in-service" ? activeTicketForDumpster(tickets, d.id) : undefined;
                const { site, customer } = ticket
                  ? ticketCustomer(ticket, sites, customers)
                  : { site: undefined, customer: undefined };
                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">#{d.id}</td>
                    <td className="px-4 py-3 text-slate-600">{d.size_yards} yd</td>
                    <td className="px-4 py-3">
                      <DumpsterStatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {ticket ? (
                        <>
                          <span className="font-medium text-slate-900">{customer?.company_name}</span>{" "}
                          <span className="text-slate-400">— {site?.site_address}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ticket && (
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
                        >
                          Open →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No dumpsters match this view.
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
