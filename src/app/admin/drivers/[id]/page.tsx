"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore, useCurrentAccount } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { driverEvents, ticketCustomer } from "@/lib/selectors";

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

  if (account?.role !== "admin") {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-500">Admin access only.</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-500">Driver not found.</p>
        <Link href="/admin" className="mt-2 inline-block text-sm font-medium text-slate-700 underline">
          Back to admin
        </Link>
      </div>
    );
  }

  const driverId = driver.id;
  const events = driverEvents(tickets, driver.name);

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
          className="mb-3 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to admin
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{driver.name}</h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              driver.active
                ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
                : "bg-zinc-100 text-zinc-600 ring-zinc-300"
            }`}
          >
            {driver.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Details</h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={driver.active}
              onChange={(e) => updateDriver(driverId, { active: e.target.checked })}
            />
            Active — shows up as a driver option on drop-off / pickup forms
          </label>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
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
          Box History ({events.length})
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">No drop-offs or pickups logged for this driver yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {events.map((ev, i) => {
              const { site, customer } = ticketCustomer(ev.ticket, sites, customers);
              return (
                <li key={`${ev.ticket.id}-${ev.action}-${i}`} className="flex flex-col gap-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/admin/tickets/${ev.ticket.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {ev.ticket.dumpster_id ? `Box #${ev.ticket.dumpster_id}` : "Box —"} ·{" "}
                      {customer?.company_name ?? "Unknown customer"}
                    </Link>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                        ev.action === "dropped"
                          ? "bg-amber-100 text-amber-800 ring-amber-300"
                          : "bg-blue-100 text-blue-800 ring-blue-300"
                      }`}
                    >
                      {ev.action === "dropped" ? "Dropped Off" : "Picked Up"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
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
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
