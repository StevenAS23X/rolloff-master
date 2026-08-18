"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useStore, useCurrentAccount, useOffsetNow } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { AccountPermissions, DumpsterStatus, FeatureFlags, Ticket, TicketStatus, TicketType } from "@/lib/types";
import { driverEvents, ticketCustomer, ticketsForCustomer } from "@/lib/selectors";
import { dumpsterStatusPercentages } from "@/lib/dumpsterMetrics";
import { TICKET_LABELS } from "@/components/StatusBadge";
import { TICKET_TYPE_LABELS } from "@/lib/ticketType";
import { formatPhoneInput } from "@/lib/phone";

const TABS = ["Dumpsters", "Tickets", "Customers", "Drivers", "Company", "Metrics"] as const;
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
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          Admin access only. Log in as <strong>Robert</strong> (Admin) in the top-right to view
          this page.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Admin's Excel-like editing tables aren't built for a phone screen — the nav link is
          already hidden below md:, this is the part that actually matters: going straight to
          /admin on a phone lands here instead of the real content. */}
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center md:hidden">
        <p className="text-slate-500 dark:text-slate-400">
          Admin is built for a larger screen — switch to a tablet or desktop browser to manage
          dumpsters, tickets, customers, and drivers.
        </p>
      </div>

      <div className="hidden flex-col gap-5 md:flex">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage dumpsters, tickets, customers, and drivers, and review business metrics.
          </p>
        </div>

        <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t ? "bg-slate-900 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Dumpsters" && <DumpstersTable />}
        {tab === "Tickets" && <TicketsTable />}
        {tab === "Customers" && (
          <div className="flex flex-col gap-5">
            <MergeCustomersPanel />
            <CustomersTable />
          </div>
        )}
        {tab === "Drivers" && <DriversTable />}
        {tab === "Company" && <CompanySettingsPanel />}
        {tab === "Metrics" && <MetricsPanel />}
      </div>
    </>
  );
}

const cellInput =
  "w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none";

function DumpstersTable() {
  const dumpsters = useStore((s) => s.dumpsters);
  const addDumpster = useStore((s) => s.addDumpster);
  const updateDumpster = useStore((s) => s.updateDumpster);
  const removeDumpster = useStore((s) => s.removeDumpster);
  const now = useOffsetNow();

  const [newId, setNewId] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newIdError, setNewIdError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(newId) || Number(newId) === 0) {
      setNewIdError("Box # must be a 4-digit number (e.g. 1099).");
      return;
    }
    if (!newSize.trim()) return;
    if (dumpsters.some((d) => d.id === newId)) {
      setNewIdError("That box # already exists.");
      return;
    }
    addDumpster({ id: newId, size_yards: newSize.trim(), status: "idle" });
    setNewId("");
    setNewSize("");
    setNewIdError(null);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Box #</th>
              <th className="px-4 py-2">Size (yd)</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">% Idle</th>
              <th className="px-4 py-2">% In Service</th>
              <th className="px-4 py-2">% Out of Service</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {dumpsters
              .slice()
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((d) => {
                const pct = dumpsterStatusPercentages(d, now);
                return (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-1.5 font-medium text-slate-900 dark:text-slate-100">#{d.id}</td>
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
                  <td className="px-4 py-1.5 text-slate-600 dark:text-slate-400">{pct.idle.toFixed(0)}%</td>
                  <td className="px-4 py-1.5 text-slate-600 dark:text-slate-400">{pct["in-service"].toFixed(0)}%</td>
                  <td className="px-4 py-1.5 text-slate-600 dark:text-slate-400">{pct["out-of-service"].toFixed(0)}%</td>
                  <td className="px-4 py-1.5 text-right">
                    <Link
                      href={`/admin/dumpsters/${d.id}`}
                      className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
                    >
                      Service record →
                    </Link>
                    <button
                      onClick={() => removeDumpster(d.id)}
                      className="ml-3 text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-center gap-2 border-t border-slate-200 dark:border-slate-800 p-3"
      >
        <div className="flex flex-col gap-1">
          <input
            value={newId}
            inputMode="numeric"
            onChange={(e) => {
              setNewId(e.target.value.replace(/\D/g, "").slice(0, 4));
              setNewIdError(null);
            }}
            placeholder="Box # (e.g. 1099)"
            className="w-40 rounded border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm"
          />
          {newIdError && <span className="text-xs font-medium text-red-600 dark:text-red-400">{newIdError}</span>}
        </div>
        <input
          value={newSize}
          onChange={(e) => setNewSize(e.target.value)}
          placeholder="Size (yd)"
          className="w-28 rounded border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm"
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

function TicketsTable() {
  const router = useRouter();
  const tickets = useStore((s) => s.tickets);
  const sites = useStore((s) => s.sites);
  const customers = useStore((s) => s.customers);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">{tickets.length} tickets total. Click a row to edit.</p>
        <Link
          href="/tickets/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Add Ticket
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Box</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Invoice #</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2 w-1/3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {tickets.map((t: Ticket) => {
              const { customer } = ticketCustomer(t, sites, customers);
              return (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/admin/tickets/${t.id}`)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">
                    {customer?.company_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                    {t.dumpster_id ? `#${t.dumpster_id}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{TICKET_LABELS[t.status]}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{t.invoice_number || "—"}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{t.invoiceable_amount || "—"}</td>
                  <td className="px-4 py-2 whitespace-normal break-words text-slate-600 dark:text-slate-400">
                    {t.notes || "—"}
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

const fieldSelectClass =
  "w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

function MergeCustomersPanel() {
  const customers = useStore((s) => s.customers);
  const sites = useStore((s) => s.sites);
  const tickets = useStore((s) => s.tickets);
  const mergeCustomers = useStore((s) => s.mergeCustomers);
  const account = useCurrentAccount();

  const [keepId, setKeepId] = useState("");
  const [mergeId, setMergeId] = useState("");
  const [confirming, setConfirming] = useState(false);

  const sorted = customers.slice().sort((a, b) => a.company_name.localeCompare(b.company_name));
  const keepCustomer = customers.find((c) => c.id === keepId);
  const mergeCustomer = customers.find((c) => c.id === mergeId);
  const movedSiteCount = mergeId ? sites.filter((s) => s.customer_id === mergeId).length : 0;
  const movedTicketCount = mergeId ? ticketsForCustomer(tickets, sites, mergeId).length : 0;
  const canMerge = Boolean(keepId && mergeId && keepId !== mergeId);

  function handleConfirm() {
    if (!canMerge || !account) return;
    mergeCustomers(keepId, mergeId, account.name);
    setKeepId("");
    setMergeId("");
    setConfirming(false);
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Merge Duplicate Customers
      </h2>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        Combine two customer records into one — every site and ticket on the duplicate moves to
        the customer you keep, and the duplicate is deleted.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Keep this customer</span>
          <select value={keepId} onChange={(e) => setKeepId(e.target.value)} className={fieldSelectClass}>
            <option value="">Select...</option>
            {sorted.map((c) => (
              <option key={c.id} value={c.id} disabled={c.id === mergeId}>
                {c.company_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Merge away (will be deleted)</span>
          <select value={mergeId} onChange={(e) => setMergeId(e.target.value)} className={fieldSelectClass}>
            <option value="">Select...</option>
            {sorted.map((c) => (
              <option key={c.id} value={c.id} disabled={c.id === keepId}>
                {c.company_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {canMerge && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Moves <strong>{movedSiteCount}</strong> site{movedSiteCount === 1 ? "" : "s"} and{" "}
          <strong>{movedTicketCount}</strong> ticket{movedTicketCount === 1 ? "" : "s"} from{" "}
          <strong>{mergeCustomer?.company_name}</strong> to{" "}
          <strong>{keepCustomer?.company_name}</strong>, then deletes{" "}
          <strong>{mergeCustomer?.company_name}</strong>.
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={!canMerge}
          onClick={() => setConfirming(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Merge Customers
        </button>
      </div>

      {confirming &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-900 p-5 shadow-xl">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Confirm merge</h3>
              <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                This change is not reversible — please make sure all information is correct
                before proceeding.
              </p>
              <div className="mt-3 rounded-md bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  <strong>{movedSiteCount}</strong> site{movedSiteCount === 1 ? "" : "s"} and{" "}
                  <strong>{movedTicketCount}</strong> ticket{movedTicketCount === 1 ? "" : "s"} will
                  move from <strong>{mergeCustomer?.company_name}</strong> to{" "}
                  <strong>{keepCustomer?.company_name}</strong>.
                </p>
                <p className="mt-2">
                  <strong>{mergeCustomer?.company_name}</strong> will be permanently deleted.
                </p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Yes, merge and delete duplicate
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function CustomersTable() {
  const customers = useStore((s) => s.customers);
  const updateCustomerFields = useStore((s) => s.updateCustomerFields);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {customers.length} customers total. Edit any field directly.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Address</th>
              <th className="px-4 py-2">Line 2</th>
              <th className="px-4 py-2">Line 3</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">State</th>
              <th className="px-4 py-2">Zip</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="px-4 py-1.5">
                  <input
                    value={c.company_name}
                    onChange={(e) => updateCustomerFields(c.id, { company_name: e.target.value })}
                    className={cellInput}
                  />
                </td>
                <td className="px-4 py-1.5">
                  <input
                    value={c.contact_name}
                    onChange={(e) => updateCustomerFields(c.id, { contact_name: e.target.value })}
                    className={cellInput}
                  />
                </td>
                <td className="px-4 py-1.5">
                  <input
                    value={c.phone}
                    onChange={(e) => updateCustomerFields(c.id, { phone: e.target.value })}
                    className={cellInput}
                  />
                </td>
                <td className="px-4 py-1.5">
                  <input
                    value={c.email}
                    onChange={(e) => updateCustomerFields(c.id, { email: e.target.value })}
                    className={cellInput}
                  />
                </td>
                <td className="px-4 py-1.5">
                  <input
                    value={c.address}
                    onChange={(e) => updateCustomerFields(c.id, { address: e.target.value })}
                    className={cellInput}
                  />
                </td>
                <td className="px-4 py-1.5">
                  <input
                    value={c.address_line2}
                    onChange={(e) => updateCustomerFields(c.id, { address_line2: e.target.value })}
                    className={cellInput}
                  />
                </td>
                <td className="px-4 py-1.5">
                  <input
                    value={c.address_line3}
                    onChange={(e) => updateCustomerFields(c.id, { address_line3: e.target.value })}
                    className={cellInput}
                  />
                </td>
                <td className="px-4 py-1.5">
                  <input
                    value={c.city}
                    onChange={(e) => updateCustomerFields(c.id, { city: e.target.value })}
                    className={cellInput}
                  />
                </td>
                <td className="px-4 py-1.5">
                  <input
                    value={c.state}
                    onChange={(e) => updateCustomerFields(c.id, { state: e.target.value })}
                    className={cellInput}
                  />
                </td>
                <td className="px-4 py-1.5">
                  <input
                    value={c.zip}
                    onChange={(e) => updateCustomerFields(c.id, { zip: e.target.value })}
                    className={cellInput}
                  />
                </td>
                <td className="px-4 py-1.5 text-right">
                  <Link
                    href={`/customers/${c.id}`}
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
                  >
                    View jobs →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DriversTable() {
  const router = useRouter();
  const drivers = useStore((s) => s.drivers);
  const tickets = useStore((s) => s.tickets);
  const addDriver = useStore((s) => s.addDriver);
  const updateDriver = useStore((s) => s.updateDriver);
  const removeDriver = useStore((s) => s.removeDriver);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    addDriver({ name: newName.trim(), phone: newPhone.trim() });
    setNewName("");
    setNewPhone("");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {drivers.length} drivers on file. Click a row to see their drop-off / pickup history.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Boxes Handled</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {drivers
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((d) => {
                const eventCount = driverEvents(tickets, d.name).length;
                return (
                  <tr
                    key={d.id}
                    onClick={() => router.push(`/admin/drivers/${d.id}`)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{d.name}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{d.phone || "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                          d.active
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 ring-emerald-300 dark:ring-emerald-700"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-zinc-300 dark:ring-zinc-600"
                        }`}
                      >
                        {d.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{eventCount}</td>
                    <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => updateDriver(d.id, { active: !d.active })}
                        className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
                      >
                        {d.active ? "Deactivate" : "Reactivate"}
                      </button>
                      <button
                        onClick={() => removeDriver(d.id)}
                        className="ml-3 text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                  No drivers on file yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2 border-t border-slate-200 dark:border-slate-800 p-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Driver name"
          className="w-48 rounded border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm"
        />
        <input
          type="tel"
          value={newPhone}
          onChange={(e) => setNewPhone(formatPhoneInput(e.target.value))}
          placeholder="(813) 555-0142"
          className="w-40 rounded border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Add Driver
        </button>
      </form>
    </div>
  );
}

const FEATURE_FLAG_INFO: { key: keyof FeatureFlags; label: string; description: string }[] = [
  {
    key: "showCalendarTab",
    label: "Dashboard Calendar tab",
    description: "Lets dispatch switch the dashboard to a month calendar of drop/pickup dates.",
  },
  {
    key: "showDaysOnSiteFilter",
    label: "Days-on-site filter",
    description: "Shows the min/max days-on-site filter on the dashboard's Active Timers list.",
  },
  {
    key: "requireDriverFromRoster",
    label: "Require driver from roster",
    description:
      "When on, drop-off/pickup forms only let dispatch pick a driver from Admin → Drivers. When off, they can type any name.",
  },
];

const PERMISSION_INFO: { key: keyof AccountPermissions; label: string }[] = [
  { key: "manageDumpsters", label: "Manage Dumpsters" },
  { key: "viewArchived", label: "View Archived Tickets" },
];

function CompanySettingsPanel() {
  const companyInfo = useStore((s) => s.companyInfo);
  const updateCompanyInfo = useStore((s) => s.updateCompanyInfo);
  const featureFlags = useStore((s) => s.featureFlags);
  const setFeatureFlag = useStore((s) => s.setFeatureFlag);
  const accounts = useStore((s) => s.accounts);
  const updateAccountPermissions = useStore((s) => s.updateAccountPermissions);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Company Info
        </h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Shown on the dashboard and anywhere the app identifies your business.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</span>
            <input
              value={companyInfo.name}
              onChange={(e) => updateCompanyInfo({ name: e.target.value })}
              className={fieldSelectClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</span>
            <input
              type="tel"
              value={companyInfo.phone}
              onChange={(e) => updateCompanyInfo({ phone: formatPhoneInput(e.target.value) })}
              className={fieldSelectClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
            <input
              type="email"
              value={companyInfo.email}
              onChange={(e) => updateCompanyInfo({ email: e.target.value })}
              className={fieldSelectClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</span>
            <input
              value={companyInfo.address}
              onChange={(e) => updateCompanyInfo({ address: e.target.value })}
              className={fieldSelectClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">City</span>
            <input
              value={companyInfo.city}
              onChange={(e) => updateCompanyInfo({ city: e.target.value })}
              className={fieldSelectClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">State</span>
              <input
                value={companyInfo.state}
                onChange={(e) => updateCompanyInfo({ state: e.target.value })}
                className={fieldSelectClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Zip</span>
              <input
                value={companyInfo.zip}
                onChange={(e) => updateCompanyInfo({ zip: e.target.value })}
                className={fieldSelectClass}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Feature Toggles
        </h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Turn optional features on or off site-wide.</p>
        <div className="flex flex-col gap-3">
          {FEATURE_FLAG_INFO.map((flag) => (
            <label key={flag.key} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={featureFlags[flag.key]}
                onChange={(e) => setFeatureFlag(flag.key, e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{flag.label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{flag.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Account Permissions
        </h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Admins always have full access. Grant non-admin accounts extra capabilities here.
        </p>
        {accounts.filter((a) => a.role !== "admin").length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No non-admin accounts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Account</th>
                  {PERMISSION_INFO.map((p) => (
                    <th key={p.key} className="px-2 py-2 text-center">
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {accounts
                  .filter((a) => a.role !== "admin")
                  .map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">
                        {a.name} <span className="text-slate-400 dark:text-slate-500">— {a.role}</span>
                      </td>
                      {PERMISSION_INFO.map((p) => (
                        <td key={p.key} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={a.permissions?.[p.key] === true}
                            onChange={(e) => updateAccountPermissions(a.id, { [p.key]: e.target.checked })}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
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
            <p className="text-sm text-slate-400 dark:text-slate-500">No ticket history yet.</p>
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
            <p className="text-sm text-slate-400 dark:text-slate-500">No ticket history yet.</p>
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
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function MetricCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h2>
      {children}
    </div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm text-slate-500 dark:text-slate-400">{count}</span>
    </div>
  );
}
