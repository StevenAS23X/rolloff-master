"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore, useCurrentAccount } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { ticketCustomer } from "@/lib/selectors";
import { TICKET_TYPE_LABELS } from "@/lib/ticketType";
import { Ticket, TicketStatus, TicketType } from "@/lib/types";

const STATUS_OPTIONS: TicketStatus[] = [
  "draft",
  "order-taken",
  "dropped",
  "ready-to-invoice",
  "invoiced",
  "archived",
];

const TYPE_OPTIONS: TicketType[] = ["residential", "commercial", "live-load"];

const FIELD_LABELS: Record<string, string> = {
  date_of_order: "Date of Order",
  type: "Type",
  box_size: "Box Size",
  material: "Material",
  notes: "Notes",
  requested_drop_date: "Requested Drop Date",
  dumpster_id: "Box Number",
  status: "Status",
  drop_date: "Drop Date",
  drop_description: "Drop Description",
  dropped_by_driver: "Dropped By",
  pickup_date: "Pickup Date",
  picked_up_by_driver: "Picked Up By",
  invoiced: "Invoiced",
  invoice_number: "Invoice Number",
  invoiceable_amount: "Invoiceable Amount",
};

export default function AdminTicketEditPage() {
  return (
    <Hydrated>
      <AdminTicketEditContent />
    </Hydrated>
  );
}

function AdminTicketEditContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const account = useCurrentAccount();
  const tickets = useStore((s) => s.tickets);
  const sites = useStore((s) => s.sites);
  const customers = useStore((s) => s.customers);
  const dumpsters = useStore((s) => s.dumpsters);
  const changeLog = useStore((s) => s.changeLog);
  const adminUpdateTicket = useStore((s) => s.adminUpdateTicket);

  const ticket = tickets.find((t) => t.id === params.id);
  const [form, setForm] = useState<Ticket | null>(ticket ?? null);
  const [savedFlash, setSavedFlash] = useState(false);

  if (account?.role !== "admin") {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-500">Admin access only.</p>
      </div>
    );
  }

  if (!ticket || !form) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-500">Ticket not found.</p>
        <Link href="/admin" className="mt-2 inline-block text-sm font-medium text-slate-700 underline">
          Back to admin
        </Link>
      </div>
    );
  }

  const ticketId = ticket.id;
  const { site, customer } = ticketCustomer(ticket, sites, customers);
  const entries = changeLog.filter((e) => e.entityType === "ticket" && e.entityId === ticketId);

  function update<K extends keyof Ticket>(key: K, value: Ticket[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !account) return;
    adminUpdateTicket(ticketId, form, account.name);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <button
          onClick={() => router.push("/admin")}
          className="mb-3 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to admin
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          Edit Ticket — {customer?.company_name ?? "Unknown customer"}
        </h1>
        <p className="text-sm text-slate-500">{site?.site_address}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormSection title="Order">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date of Order">
              <input
                type="date"
                value={form.date_of_order}
                onChange={(e) => update("date_of_order", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Requested Drop Date">
              <input
                type="date"
                value={form.requested_drop_date}
                onChange={(e) => update("requested_drop_date", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value as TicketType)}
                className={inputClass}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {TICKET_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value as TicketStatus)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Box Size">
              <input
                value={form.box_size}
                onChange={(e) => update("box_size", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Material">
              <input
                value={form.material}
                onChange={(e) => update("material", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>
        </FormSection>

        <FormSection title="Box Assignment">
          <Field label="Box Number">
            <select
              value={form.dumpster_id ?? ""}
              onChange={(e) => update("dumpster_id", e.target.value || null)}
              className={inputClass}
            >
              <option value="">— none —</option>
              {dumpsters.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.id} — {d.size_yards}yd
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Drop Date">
              <input
                type="date"
                value={form.drop_date ?? ""}
                onChange={(e) => update("drop_date", e.target.value || null)}
                className={inputClass}
              />
            </Field>
            <Field label="Dropped By">
              <input
                value={form.dropped_by_driver}
                onChange={(e) => update("dropped_by_driver", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Drop Description">
            <input
              value={form.drop_description}
              onChange={(e) => update("drop_description", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pickup Date">
              <input
                type="date"
                value={form.pickup_date ?? ""}
                onChange={(e) => update("pickup_date", e.target.value || null)}
                className={inputClass}
              />
            </Field>
            <Field label="Picked Up By">
              <input
                value={form.picked_up_by_driver}
                onChange={(e) => update("picked_up_by_driver", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Invoicing">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.invoiced}
              onChange={(e) => update("invoiced", e.target.checked)}
            />
            Invoiced
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Invoice Number">
              <input
                value={form.invoice_number}
                onChange={(e) => update("invoice_number", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Invoiceable Amount ($)">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.invoiceable_amount}
                onChange={(e) => update("invoiceable_amount", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3">
          {savedFlash && <span className="text-sm font-medium text-emerald-600">Saved</span>}
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Save Changes
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Change Log
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400">No edits logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries
              .slice()
              .sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1))
              .map((entry) => (
                <li key={entry.id} className="text-sm text-slate-700">
                  <span className="font-medium">{FIELD_LABELS[entry.field] ?? entry.field}</span>{" "}
                  changed from <span className="text-slate-500">&quot;{entry.oldValue || "—"}&quot;</span>{" "}
                  to <span className="text-slate-900">&quot;{entry.newValue || "—"}&quot;</span>
                  <span className="text-slate-400">
                    {" "}
                    — {entry.changedBy}, {new Date(entry.changedAt).toLocaleString()}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
