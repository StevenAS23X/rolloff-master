"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore, useCurrentAccount } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { TicketStatusBadge } from "@/components/StatusBadge";
import { TimerBadge } from "@/components/TimerBadge";
import { getSite, ticketsForCustomer } from "@/lib/selectors";
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
  const isAdmin = account?.role === "admin";

  const customer = customers.find((c) => c.id === params.id);

  if (!customer) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-500">Customer not found.</p>
        <Link href="/customers" className="mt-2 inline-block text-sm font-medium text-slate-700 underline">
          Back to customers
        </Link>
      </div>
    );
  }

  const jobs = ticketsForCustomer(tickets, sites, customer.id).sort((a, b) =>
    a.date_of_order < b.date_of_order ? 1 : -1
  );
  const currentJobs = jobs.filter((t) => t.status !== "archived");
  const pastJobs = isAdmin ? jobs.filter((t) => t.status === "archived") : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <button
          onClick={() => router.push("/customers")}
          className="mb-3 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to customers
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{customer.company_name}</h1>
        <p className="text-sm text-slate-500">{customer.contact_name}</p>
      </div>

      <InfoCard title="Billing Info">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Contact" value={customer.contact_name} />
          <Field label="Phone" value={customer.phone} />
          <Field label="Email" value={customer.email || "—"} />
          <Field
            label="Address"
            value={`${customer.address}, ${customer.city} ${customer.state}`}
          />
        </dl>
      </InfoCard>

      <div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Current Jobs</h2>
        {currentJobs.length === 0 ? (
          <EmptyRow text="No active jobs for this customer." />
        ) : (
          <JobsTable jobs={currentJobs} sites={sites} showTimer />
        )}
      </div>

      {pastJobs.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Past Jobs</h2>
          <JobsTable jobs={pastJobs} sites={sites} />
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Site Address</th>
              <th className="px-4 py-2">Site Contact</th>
              <th className="px-4 py-2">Box</th>
              <th className="px-4 py-2">Status</th>
              {showTimer && <th className="px-4 py-2">Timer</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map((ticket) => {
              const site = getSite(sites, ticket.site_id);
              return (
                <tr
                  key={ticket.id}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{site?.site_address ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {site?.site_contact_name || "—"}
                    {site?.site_contact_phone && (
                      <span className="text-slate-400"> · {site.site_contact_phone}</span>
                    )}
                  </td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
