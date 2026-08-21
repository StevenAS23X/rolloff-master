"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore, useCurrentAccount } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { driverEvents, ticketCustomer } from "@/lib/selectors";
import { formatPhoneInput } from "@/lib/phone";

export default function AdminDriverEditPage() {
  return (
    <Hydrated>
      <AdminDriverEditContent />
    </Hydrated>
  );
}

function AdminDriverEditContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const account = useCurrentAccount();
  const drivers = useStore((s) => s.drivers);
  const tickets = useStore((s) => s.tickets);
  const sites = useStore((s) => s.sites);
  const customers = useStore((s) => s.customers);
  const updateDriver = useStore((s) => s.updateDriver);

  const driver = drivers.find((d) => d.id === params.id);
  const [name, setName] = useState(driver?.name ?? "");
  const [phone, setPhone] = useState(driver?.phone ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");

  if (account?.role !== "admin") {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Admin access only.</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Driver not found.</p>
        <Link href="/admin" className="mt-2 inline-block text-sm font-medium text-slate-700 dark:text-slate-300 underline">
          Back to admin
        </Link>
      </div>
    );
  }

  const driverId = driver.id;
  const events = driverEvents(tickets, driver.name);
  const historyQueryTrimmed = historyQuery.trim().toLowerCase().replace(/#/g, "");
  const filteredEvents = !historyQueryTrimmed
    ? events
    : events.filter((ev) => {
        const { site, customer } = ticketCustomer(ev.ticket, sites, customers);
        const haystack = `${customer?.company_name ?? ""} ${site?.site_address ?? ""} ${
          ev.ticket.dumpster_id ?? ""
        } ${ev.action} ${ev.date}`.toLowerCase();
        return haystack.includes(historyQueryTrimmed);
      });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateDriver(driverId, { name: name.trim(), phone: phone.trim() });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <button
          onClick={() => router.push("/admin")}
          className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        >
          ← Back to admin
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{driver.name}</h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              driver.active
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 ring-emerald-300 dark:ring-emerald-700"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-zinc-300 dark:ring-zinc-600"
            }`}
          >
            {driver.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Details</h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                className={inputClass}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={driver.active}
              onChange={(e) => updateDriver(driverId, { active: e.target.checked })}
            />
            Active — shows up as a driver option on drop-off / pickup forms
          </label>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          {savedFlash && <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Saved</span>}
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Save Changes
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Box History ({events.length})
          </h2>
          {events.length > 0 && (
            <input
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="Search customer, address, box #..."
              className="w-56 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm"
            />
          )}
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No drop-offs or pickups logged for this driver yet.</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No history matches that search.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEvents.map((ev, i) => {
              const { site, customer } = ticketCustomer(ev.ticket, sites, customers);
              return (
                <li key={`${ev.ticket.id}-${ev.action}-${i}`} className="flex flex-col gap-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/admin/tickets/${ev.ticket.id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                    >
                      {ev.ticket.dumpster_id ? `Box #${ev.ticket.dumpster_id}` : "Box —"} ·{" "}
                      {customer?.company_name ?? "Unknown customer"}
                    </Link>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                        ev.action === "dropped"
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 ring-amber-300 dark:ring-amber-700"
                          : "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 ring-blue-300 dark:ring-blue-700"
                      }`}
                    >
                      {ev.action === "dropped" ? "Dropped Off" : "Picked Up"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {site?.site_address ?? "—"} — {ev.date}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
