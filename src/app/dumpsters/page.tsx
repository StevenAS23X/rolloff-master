"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore, useCurrentAccount } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { DumpsterStatusBadge } from "@/components/StatusBadge";
import { activeTicketForDumpster, hasPermission, ticketCustomer } from "@/lib/selectors";
import { DumpsterStatus } from "@/lib/types";

const FILTERS: { label: string; value: DumpsterStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Idle", value: "idle" },
  { label: "In Service", value: "in-service" },
  { label: "Out of Service", value: "out-of-service" },
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
  const updateDumpster = useStore((s) => s.updateDumpster);
  const account = useCurrentAccount();
  const canManage = hasPermission(account, "manageDumpsters");
  const [filter, setFilter] = useState<DumpsterStatus | "all">("all");
  const [query, setQuery] = useState("");

  const idleCount = dumpsters.filter((d) => d.status === "idle").length;
  const inServiceCount = dumpsters.filter((d) => d.status === "in-service").length;
  const outOfServiceCount = dumpsters.filter((d) => d.status === "out-of-service").length;

  const filtered = useMemo(() => {
    return dumpsters
      .filter((d) => filter === "all" || d.status === filter)
      .filter((d) => !query.trim() || d.id.includes(query.trim().replace(/#/g, "")))
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [dumpsters, filter, query]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dumpsters</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {dumpsters.length} boxes total — {idleCount} idle, {inServiceCount} in service,{" "}
          {outOfServiceCount} out of service.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value ? "bg-slate-900 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
          className="min-w-[180px] flex-1 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {/* Table layout for wider screens. */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Box #</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Current Job</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((d) => {
                const ticket = d.status === "in-service" ? activeTicketForDumpster(tickets, d.id) : undefined;
                const { site, customer } = ticket
                  ? ticketCustomer(ticket, sites, customers)
                  : { site: undefined, customer: undefined };
                return (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">#{d.id}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{d.size_yards} yd</td>
                    <td className="px-4 py-3">
                      <DumpsterStatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {ticket ? (
                        <>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{customer?.company_name}</span>{" "}
                          <span className="text-slate-400 dark:text-slate-500">— {site?.site_address}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ticket && (
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline"
                        >
                          Open →
                        </Link>
                      )}
                      {!ticket && canManage && d.status === "idle" && (
                        <button
                          onClick={() => updateDumpster(d.id, { status: "out-of-service" })}
                          className="font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                        >
                          Mark Out of Service
                        </button>
                      )}
                      {!ticket && canManage && d.status === "out-of-service" && (
                        <button
                          onClick={() => updateDumpster(d.id, { status: "idle" })}
                          className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 hover:underline"
                        >
                          Return to Service
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    No dumpsters match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Stacked card layout for phones. */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
          {filtered.map((d) => {
            const ticket = d.status === "in-service" ? activeTicketForDumpster(tickets, d.id) : undefined;
            const { site, customer } = ticket
              ? ticketCustomer(ticket, sites, customers)
              : { site: undefined, customer: undefined };
            return (
              <div key={d.id} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    #{d.id} · {d.size_yards} yd
                  </span>
                  <DumpsterStatusBadge status={d.status} />
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {ticket ? (
                    <>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{customer?.company_name}</span>{" "}
                      <span className="text-slate-400 dark:text-slate-500">— {site?.site_address}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="text-sm">
                  {ticket && (
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline"
                    >
                      Open →
                    </Link>
                  )}
                  {!ticket && canManage && d.status === "idle" && (
                    <button
                      onClick={() => updateDumpster(d.id, { status: "out-of-service" })}
                      className="font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                    >
                      Mark Out of Service
                    </button>
                  )}
                  {!ticket && canManage && d.status === "out-of-service" && (
                    <button
                      onClick={() => updateDumpster(d.id, { status: "idle" })}
                      className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 hover:underline"
                    >
                      Return to Service
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">No dumpsters match this view.</div>
          )}
        </div>
      </div>
    </div>
  );
}
