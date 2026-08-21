"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore, useCurrentAccount } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { TicketStatusBadge } from "@/components/StatusBadge";
import { TimerBadge } from "@/components/TimerBadge";
import { getSite, hasPermission, ticketsForCustomer } from "@/lib/selectors";
import { formatAddress } from "@/lib/address";
import { Ticket, Site } from "@/lib/types";

export default function CustomerDetailPage() {
  return (
    <Hydrated>
      <CustomerDetailContent />
    </Hydrated>
  );
}

function CustomerDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customers = useStore((s) => s.customers);
  const sites = useStore((s) => s.sites);
  const tickets = useStore((s) => s.tickets);
  const account = useCurrentAccount();
  const canViewArchived = hasPermission(account, "viewArchived");
  const [query, setQuery] = useState("");

  const customer = customers.find((c) => c.id === params.id);

  if (!customer) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Customer not found.</p>
        <Link href="/customers" className="mt-2 inline-block text-sm font-medium text-slate-700 dark:text-slate-300 underline">
          Back to customers
        </Link>
      </div>
    );
  }

  const allJobs = ticketsForCustomer(tickets, sites, customer.id).sort((a, b) =>
    a.date_of_order < b.date_of_order ? 1 : -1
  );
  const q = query.trim().toLowerCase().replace(/#/g, "");
  const jobs = !q
    ? allJobs
    : allJobs.filter((t) => {
        const site = getSite(sites, t.site_id);
        const haystack = `${site?.site_address ?? ""} ${site?.site_contact_name ?? ""} ${
          t.dumpster_id ?? ""
        } ${t.status}`.toLowerCase();
        return haystack.includes(q);
      });
  const currentJobs = jobs.filter((t) => t.status !== "archived");
  const pastJobs = canViewArchived ? jobs.filter((t) => t.status === "archived") : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <button
          onClick={() => router.push("/customers")}
          className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        >
          ← Back to customers
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{customer.company_name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{customer.contact_name}</p>
      </div>

      <InfoCard title="Billing Info">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Contact" value={customer.contact_name} />
          <Field label="Phone" value={customer.phone} />
          <Field label="Email" value={customer.email || "—"} />
          <Field
            label="Address"
            value={formatAddress({
              line1: customer.address,
              line2: customer.address_line2,
              line3: customer.address_line3,
              city: customer.city,
              state: customer.state,
              zip: customer.zip,
            })}
          />
        </dl>
      </InfoCard>

      {allJobs.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search site address, contact, box #..."
          className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
        />
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Current Jobs</h2>
        {currentJobs.length === 0 ? (
          <EmptyRow text={q ? "No jobs match that search." : "No active jobs for this customer."} />
        ) : (
          <JobsTable jobs={currentJobs} sites={sites} showTimer />
        )}
      </div>

      {pastJobs.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Past Jobs</h2>
          <JobsTable jobs={pastJobs} sites={sites} showTimer />
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 dark:text-slate-200">{value}</dd>
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

function JobsTable({
  jobs,
  sites,
  showTimer = false,
}: {
  jobs: Ticket[];
  sites: Site[];
  showTimer?: boolean;
}) {
  const router = useRouter();
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Site Address</th>
              <th className="px-4 py-2">Site Contact</th>
              <th className="px-4 py-2">Box</th>
              <th className="px-4 py-2">Status</th>
              {showTimer && <th className="px-4 py-2">Timer</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {jobs.map((ticket) => {
              const site = getSite(sites, ticket.site_id);
              return (
                <tr
                  key={ticket.id}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{site?.site_address ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {site?.site_contact_name || "—"}
                    {site?.site_contact_phone && (
                      <span className="text-slate-400 dark:text-slate-500"> · {site.site_contact_phone}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
