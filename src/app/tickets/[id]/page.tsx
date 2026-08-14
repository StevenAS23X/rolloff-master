"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { TicketStatusBadge } from "@/components/StatusBadge";
import { TimerBadge } from "@/components/TimerBadge";
import { ticketCustomer } from "@/lib/selectors";
import { todayISO } from "@/lib/timer";

export default function TicketDetailPage() {
  return (
    <Hydrated>
      <TicketDetailContent />
    </Hydrated>
  );
}

function TicketDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tickets = useStore((s) => s.tickets);
  const sites = useStore((s) => s.sites);
  const customers = useStore((s) => s.customers);
  const dumpsters = useStore((s) => s.dumpsters);

  const ticket = tickets.find((t) => t.id === params.id);

  if (!ticket) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-500">Ticket not found.</p>
        <Link href="/tickets" className="mt-2 inline-block text-sm font-medium text-slate-700 underline">
          Back to tickets
        </Link>
      </div>
    );
  }

  const { site, customer } = ticketCustomer(ticket, sites, customers);
  const dumpster = ticket.dumpster_id ? dumpsters.find((d) => d.id === ticket.dumpster_id) : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <button
          onClick={() => router.push("/tickets")}
          className="mb-3 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to tickets
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {customer?.company_name ?? "Unknown customer"}
            </h1>
            <p className="text-sm text-slate-500">{site?.site_address}</p>
          </div>
          <div className="flex items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TimerBadge ticket={ticket} />
          </div>
        </div>
      </div>

      <InfoCard title="Order Details">
        <InfoGrid
          items={[
            ["Date of Order", ticket.date_of_order],
            ["Requested Drop Date", ticket.requested_drop_date],
            ["Type", ticket.type],
            ["Box Size", `${ticket.box_size} yd`],
            ["Material", ticket.material],
            ["Notes", ticket.notes || "—"],
          ]}
        />
      </InfoCard>

      <InfoCard title="Customer & Site">
        <InfoGrid
          items={[
            ["Contact", customer?.contact_name ?? "—"],
            ["Phone", customer?.phone ?? "—"],
            ["Email", customer?.email ?? "—"],
            ["Billing Address", `${customer?.address ?? ""}, ${customer?.city ?? ""} ${customer?.state ?? ""}`],
            ["Site Contact", site?.site_contact_name ?? "—"],
            ["Site Contact Phone", site?.site_contact_phone ?? "—"],
          ]}
        />
      </InfoCard>

      {ticket.dumpster_id && (
        <InfoCard title="Box">
          <InfoGrid
            items={[
              ["Box Number", `#${ticket.dumpster_id}`],
              ["Dumpster Status", dumpster?.status ?? "—"],
              ["Drop Date", ticket.drop_date ?? "—"],
              ["Placed", ticket.drop_description || "—"],
              ["Dropped By", ticket.dropped_by_driver || "—"],
              ["Pickup Date", ticket.pickup_date ?? "—"],
              ["Picked Up By", ticket.picked_up_by_driver || "—"],
            ]}
          />
        </InfoCard>
      )}

      {ticket.status === "archived" && (
        <InfoCard title="Invoice">
          <InfoGrid
            items={[
              ["Invoice Number", ticket.invoice_number || "—"],
              ["Invoiceable Amount", ticket.invoiceable_amount ? `$${ticket.invoiceable_amount}` : "—"],
              ["Invoiced", ticket.invoiced ? "Yes" : "No"],
            ]}
          />
        </InfoCard>
      )}

      {ticket.status === "order-taken" && <DropForm ticketId={ticket.id} />}
      {ticket.status === "dropped" && <PickupForm ticketId={ticket.id} />}
      {ticket.status === "ready-to-invoice" && <InvoiceForm ticketId={ticket.id} />}
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

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-slate-400">{label}</dt>
          <dd className="text-sm text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

function DropForm({ ticketId }: { ticketId: string }) {
  const dumpsters = useStore((s) => s.dumpsters);
  const dropTicket = useStore((s) => s.dropTicket);
  const idleDumpsters = dumpsters.filter((d) => d.status === "idle");

  const [dumpsterId, setDumpsterId] = useState("");
  const [description, setDescription] = useState("");
  const [driver, setDriver] = useState("");
  const [dropDate, setDropDate] = useState(todayISO());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dumpsterId) return;
    dropTicket(ticketId, {
      dumpster_id: dumpsterId,
      drop_description: description,
      dropped_by_driver: driver,
      drop_date: dropDate,
    });
  }

  return (
    <InfoCard title="Box Dropped">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Box Number (idle dumpsters)</span>
          <select
            required
            value={dumpsterId}
            onChange={(e) => setDumpsterId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Select a dumpster...
            </option>
            {idleDumpsters.map((d) => (
              <option key={d.id} value={d.id}>
                #{d.id} — {d.size_yards}yd
              </option>
            ))}
          </select>
          {idleDumpsters.length === 0 && (
            <span className="text-xs text-red-600">No idle dumpsters available.</span>
          )}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Drop Date</span>
          <input
            type="date"
            required
            value={dropDate}
            onChange={(e) => setDropDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Where it was placed</span>
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Driveway, left side"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Driver</span>
          <input
            required
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={idleDumpsters.length === 0}
          className="self-end rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mark Box Dropped
        </button>
      </form>
    </InfoCard>
  );
}

function PickupForm({ ticketId }: { ticketId: string }) {
  const pickUpTicket = useStore((s) => s.pickUpTicket);
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [driver, setDriver] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    pickUpTicket(ticketId, { pickup_date: pickupDate, picked_up_by_driver: driver });
  }

  return (
    <InfoCard title="Box Picked Up">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Pickup Date</span>
          <input
            type="date"
            required
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Driver</span>
          <input
            required
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Mark Box Picked Up
        </button>
      </form>
    </InfoCard>
  );
}

function InvoiceForm({ ticketId }: { ticketId: string }) {
  const invoiceTicket = useStore((s) => s.invoiceTicket);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    invoiceTicket(ticketId, { invoice_number: invoiceNumber, invoiceable_amount: amount });
  }

  return (
    <InfoCard title="Invoice">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Invoice Number</span>
          <input
            required
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Invoiceable Amount ($)</span>
          <input
            required
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Mark Invoiced &amp; Archive
        </button>
      </form>
    </InfoCard>
  );
}
