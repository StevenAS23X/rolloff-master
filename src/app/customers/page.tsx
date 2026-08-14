"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { ticketsForCustomer } from "@/lib/selectors";

export default function CustomersPage() {
  return (
    <Hydrated>
      <CustomersContent />
    </Hydrated>
  );
}

function CustomersContent() {
  const customers = useStore((s) => s.customers);
  const sites = useStore((s) => s.sites);
  const tickets = useStore((s) => s.tickets);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter(
        (c) =>
          !q ||
          c.company_name.toLowerCase().includes(q) ||
          c.contact_name.toLowerCase().includes(q)
      )
      .slice()
      .sort((a, b) => a.company_name.localeCompare(b.company_name));
  }, [customers, query]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500">Click a customer to see their jobs and site contacts.</p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search company or contact name..."
        className="max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* Table layout for wider screens. */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Active Jobs</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const activeJobs = ticketsForCustomer(tickets, sites, c.id).filter(
                  (t) => t.status !== "archived"
                ).length;
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/customers/${c.id}`} className="hover:underline">
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.contact_name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{c.email}</td>
                    <td className="px-4 py-3 text-slate-600">{activeJobs}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No customers match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Stacked card layout for phones. */}
        <div className="divide-y divide-slate-100 sm:hidden">
          {filtered.map((c) => {
            const activeJobs = ticketsForCustomer(tickets, sites, c.id).filter(
              (t) => t.status !== "archived"
            ).length;
            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex flex-col gap-1.5 px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-900">{c.company_name}</span>
                  <span className="whitespace-nowrap text-sm text-slate-500">{activeJobs} active</span>
                </div>
                <div className="text-sm text-slate-600">{c.contact_name}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                  <span>{c.phone}</span>
                  <span className="break-all">{c.email}</span>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-400">No customers match this search.</div>
          )}
        </div>
      </div>
    </div>
  );
}
