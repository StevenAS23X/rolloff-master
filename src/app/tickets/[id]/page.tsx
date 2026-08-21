"use client";

import { useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { useStore, useCurrentAccount } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { TicketStatusBadge } from "@/components/StatusBadge";
import { TimerBadge } from "@/components/TimerBadge";
import { InlineEditableText } from "@/components/InlineEditableText";
import { hasPermission, ticketCustomer } from "@/lib/selectors";
import { todayISO } from "@/lib/timer";
import { formatAddress } from "@/lib/address";
import { TICKET_FIELD_LABELS } from "@/lib/ticketFields";
import { TICKET_TYPE_LABELS } from "@/lib/ticketType";
import { LiveLoad, Ticket } from "@/lib/types";

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
  const updateTicketFields = useStore((s) => s.updateTicketFields);
  const account = useCurrentAccount();

  const ticket = tickets.find((t) => t.id === params.id);

  if (!ticket) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Ticket not found.</p>
        <Link href="/tickets" className="mt-2 inline-block text-sm font-medium text-slate-700 dark:text-slate-300 underline">
          Back to tickets
        </Link>
      </div>
    );
  }

  if (ticket.status === "archived" && !hasPermission(account, "viewArchived")) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          This ticket is archived. You don&apos;t have permission to view archived tickets.
        </p>
        <Link href="/tickets" className="mt-2 inline-block text-sm font-medium text-slate-700 dark:text-slate-300 underline">
          Back to tickets
        </Link>
      </div>
    );
  }

  const { site, customer } = ticketCustomer(ticket, sites, customers);
  const dumpster = ticket.dumpster_id ? dumpsters.find((d) => d.id === ticket.dumpster_id) : undefined;
  const isLiveLoad = ticket.type === "live-load";
  const canEdit = hasPermission(account, "editTickets") && ticket.status !== "draft" && ticket.status !== "archived";
  const siteAddress = site
    ? formatAddress({
        line1: site.site_address,
        line2: site.site_address_line2,
        line3: site.site_address_line3,
        city: site.site_city,
        state: site.site_state,
        zip: site.site_zip,
      })
    : "";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <button
          onClick={() => router.push("/tickets")}
          className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        >
          ← Back to tickets
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {customer ? (
                <Link href={`/customers/${customer.id}`} className="hover:underline">
                  {customer.company_name}
                </Link>
              ) : (
                "Unknown customer"
              )}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{siteAddress}</p>
          </div>
          <div className="flex items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TimerBadge ticket={ticket} />
          </div>
        </div>
      </div>

      <EditableOrderAndBox
        ticket={ticket}
        canEdit={canEdit}
        isLiveLoad={isLiveLoad}
        accountName={account?.name ?? ""}
        siteAddress={siteAddress}
        dumpsterStatus={dumpster?.status ?? "—"}
      />

      <InfoCard title={`Notes${account ? " (click to edit)" : ""}`}>
        <InlineEditableText
          value={ticket.notes}
          editable={!!account}
          onSave={(notes) => updateTicketFields(ticket.id, { notes })}
          placeholder={account ? "Click to add notes..." : "No notes yet."}
        />
      </InfoCard>

      <InfoCard title="Customer & Site">
        <InfoGrid
          items={[
            ["Contact", customer?.contact_name ?? "—"],
            ["Phone", customer?.phone ?? "—"],
            ["Email", customer?.email ?? "—"],
            [
              "Billing Address",
              customer
                ? formatAddress({
                    line1: customer.address,
                    line2: customer.address_line2,
                    line3: customer.address_line3,
                    city: customer.city,
                    state: customer.state,
                    zip: customer.zip,
                  })
                : "—",
            ],
            ["Site Contact", site?.site_contact_name ?? "—"],
            ["Site Contact Phone", site?.site_contact_phone ?? "—"],
          ]}
        />
      </InfoCard>

      {account && <AdditionalFeesCard ticket={ticket} accountName={account.name} />}

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

      {ticket.status === "draft" && (
        <InfoCard title="Draft">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            This ticket hasn&apos;t been finished yet. Pick up where you left off to turn it into
            a real order.
          </p>
          <Link
            href={`/tickets/new?draft=${ticket.id}`}
            className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Continue Editing →
          </Link>
        </InfoCard>
      )}
      {ticket.status === "order-taken" && isLiveLoad && (
        <LiveLoadCompletionForm ticketId={ticket.id} estimatedCount={ticket.live_load_count} />
      )}
      {ticket.status === "order-taken" && !isLiveLoad && (
        <DropForm ticketId={ticket.id} requestedSize={ticket.box_size} />
      )}
      {ticket.status === "dropped" && <PickupForm ticketId={ticket.id} />}
      {ticket.status === "ready-to-invoice" && <InvoiceForm ticketId={ticket.id} />}
    </div>
  );
}

function InfoCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</dt>
          <dd className="text-sm text-slate-800 dark:text-slate-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The keys this panel is willing to edit, given the ticket's current state. */
function editableKeys(ticket: Ticket, isLiveLoad: boolean): (keyof Ticket)[] {
  const keys: (keyof Ticket)[] = ["date_of_order", "requested_drop_date"];
  if (!isLiveLoad) keys.push("box_size", "material");
  if (ticket.dumpster_id) {
    keys.push("drop_date", "drop_description", "dropped_by_driver", "drop_condition_notes");
    if (ticket.pickup_date) keys.push("pickup_date", "picked_up_by_driver", "pickup_condition_notes");
  }
  return keys;
}

function EditableOrderAndBox({
  ticket,
  canEdit,
  isLiveLoad,
  accountName,
  siteAddress,
  dumpsterStatus,
}: {
  ticket: Ticket;
  canEdit: boolean;
  isLiveLoad: boolean;
  accountName: string;
  siteAddress: string;
  dumpsterStatus: string;
}) {
  const updateTicketWithLog = useStore((s) => s.updateTicketWithLog);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Ticket>(ticket);
  const [confirming, setConfirming] = useState(false);

  function startEditing() {
    setForm(ticket);
    setEditing(true);
  }

  function update<K extends keyof Ticket>(key: K, value: Ticket[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const keys = editableKeys(ticket, isLiveLoad);
  const changes = keys
    .filter((key) => form[key] !== ticket[key])
    .map((key) => ({ key, from: String(ticket[key] ?? ""), to: String(form[key] ?? "") }));

  function handleConfirm() {
    if (changes.length === 0 || !accountName) {
      setEditing(false);
      setConfirming(false);
      return;
    }
    const patch: Partial<Ticket> = {};
    for (const c of changes) (patch as Record<string, unknown>)[c.key] = form[c.key];
    updateTicketWithLog(ticket.id, patch, accountName);
    setConfirming(false);
    setEditing(false);
  }

  if (!editing) {
    const orderItems: [string, string][] = [
      ["Date of Order", ticket.date_of_order],
      [isLiveLoad ? "Date of Live Load" : "Requested Drop Date", ticket.requested_drop_date],
      ["Type", TICKET_TYPE_LABELS[ticket.type]],
    ];
    if (isLiveLoad) {
      orderItems.push(["Number of Loads (est.)", ticket.live_load_count || "—"]);
    } else {
      orderItems.push(["Box Size", `${ticket.box_size} yd`], ["Material", ticket.material]);
    }
    return (
      <>
        <InfoCard
          title="Order Details"
          action={canEdit ? <EditButton onClick={startEditing} /> : null}
        >
          <InfoGrid items={orderItems} />
        </InfoCard>

        {!isLiveLoad && ticket.dumpster_id && (
          <InfoCard title="Box" action={canEdit ? <EditButton onClick={startEditing} /> : null}>
            <InfoGrid
              items={[
                ["Site Address", siteAddress || "—"],
                ["Box Number", `#${ticket.dumpster_id}`],
                ["Dumpster Status", dumpsterStatus],
                ["Drop Date", ticket.drop_date ?? "—"],
                ["Placed", ticket.drop_description || "—"],
                ["Dropped By", ticket.dropped_by_driver || "—"],
                ["Drop Condition Notes", ticket.drop_condition_notes || "—"],
                ["Pickup Date", ticket.pickup_date ?? "—"],
                ["Picked Up By", ticket.picked_up_by_driver || "—"],
                ["Pickup Condition Notes", ticket.pickup_condition_notes || "—"],
              ]}
            />
          </InfoCard>
        )}

        {isLiveLoad && (
          <InfoCard title="Loads">
            <InfoGrid items={[["Site Address", siteAddress || "—"]]} />
            {ticket.loads.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
                No loads logged yet — completed once the truck finishes for the day.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {ticket.loads.map((load, i) => (
                  <li key={load.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Load {i + 1} — {load.size_yards} yd
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {load.dumpster_id ? `Box #${load.dumpster_id} · ` : ""}
                      {load.material || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {ticket.live_load_drivers.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-slate-400 dark:text-slate-500">Drivers</p>
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {ticket.live_load_drivers.join(", ")}
                </p>
              </div>
            )}
          </InfoCard>
        )}
      </>
    );
  }

  return (
    <InfoCard title="Edit Ticket">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Date of Order</span>
            <input
              type="date"
              value={form.date_of_order}
              onChange={(e) => update("date_of_order", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isLiveLoad ? "Date of Live Load" : "Requested Drop Date"}
            </span>
            <input
              type="date"
              value={form.requested_drop_date}
              onChange={(e) => update("requested_drop_date", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        {!isLiveLoad && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Box Size</span>
              <input
                value={form.box_size}
                onChange={(e) => update("box_size", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Material</span>
              <input
                value={form.material}
                onChange={(e) => update("material", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        )}
        {!isLiveLoad && ticket.dumpster_id && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Drop Date</span>
                <input
                  type="date"
                  value={form.drop_date ?? ""}
                  onChange={(e) => update("drop_date", e.target.value || null)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dropped By</span>
                <input
                  value={form.dropped_by_driver}
                  onChange={(e) => update("dropped_by_driver", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Placed</span>
              <input
                value={form.drop_description}
                onChange={(e) => update("drop_description", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Drop Condition Notes</span>
              <textarea
                value={form.drop_condition_notes}
                onChange={(e) => update("drop_condition_notes", e.target.value)}
                rows={2}
                className={inputClass}
              />
            </label>
            {ticket.pickup_date && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pickup Date</span>
                    <input
                      type="date"
                      value={form.pickup_date ?? ""}
                      onChange={(e) => update("pickup_date", e.target.value || null)}
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Picked Up By</span>
                    <input
                      value={form.picked_up_by_driver}
                      onChange={(e) => update("picked_up_by_driver", e.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Pickup Condition Notes
                  </span>
                  <textarea
                    value={form.pickup_condition_notes}
                    onChange={(e) => update("pickup_condition_notes", e.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                </label>
              </>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={changes.length === 0}
            onClick={() => setConfirming(true)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save Changes
          </button>
        </div>
      </div>

      {confirming &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-900 p-5 shadow-xl">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Confirm changes</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Please review before saving — this updates the ticket for everyone.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 rounded-md bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-700 dark:text-slate-300">
                {changes.map((c) => (
                  <li key={c.key}>
                    <span className="font-medium">{TICKET_FIELD_LABELS[c.key] ?? c.key}</span>:{" "}
                    <span className="text-slate-500 dark:text-slate-400">&quot;{c.from || "—"}&quot;</span> →{" "}
                    <span className="text-slate-900 dark:text-slate-100">&quot;{c.to || "—"}&quot;</span>
                  </li>
                ))}
              </ul>
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
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Yes, save changes
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </InfoCard>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
    >
      Edit
    </button>
  );
}

function AdditionalFeesCard({ ticket, accountName }: { ticket: Ticket; accountName: string }) {
  const addTicketFee = useStore((s) => s.addTicketFee);
  const removeTicketFee = useStore((s) => s.removeTicketFee);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [sign, setSign] = useState<"add" | "subtract">("add");

  const total = ticket.additionalFees.reduce((sum, f) => sum + f.amount, 0);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!description.trim() || !parsed) return;
    addTicketFee(ticket.id, { description: description.trim(), amount: sign === "add" ? parsed : -parsed }, accountName);
    setDescription("");
    setAmount("");
  }

  return (
    <InfoCard title="Additional Fees">
      {ticket.additionalFees.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No additional fees on this ticket.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {ticket.additionalFees.map((fee) => (
            <li key={fee.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200">{fee.description}</span>
                <span className="ml-2 text-slate-400 dark:text-slate-500">
                  {fee.addedBy}, {new Date(fee.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={fee.amount < 0 ? "font-medium text-red-600 dark:text-red-400" : "font-medium text-slate-900 dark:text-slate-100"}>
                  {fee.amount < 0 ? "-" : "+"}${Math.abs(fee.amount).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeTicketFee(ticket.id, fee.id)}
                  className="text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
          <li className="flex items-center justify-between py-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <span>Total</span>
            <span>{total < 0 ? "-" : ""}${Math.abs(total).toFixed(2)}</span>
          </li>
        </ul>
      )}
      <form onSubmit={handleAdd} className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Extra weight overage"
            className={inputClass}
          />
        </label>
        <label className="flex w-28 flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Amount ($)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </label>
        <select
          value={sign}
          onChange={(e) => setSign(e.target.value as "add" | "subtract")}
          className={`${inputClass} w-32`}
        >
          <option value="add">Add (+)</option>
          <option value="subtract">Subtract (-)</option>
        </select>
        <button
          type="submit"
          disabled={!description.trim() || !parseFloat(amount || "0")}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add Fee
        </button>
      </form>
    </InfoCard>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

function DriverField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const drivers = useStore((s) => s.drivers);
  const requireFromRoster = useStore((s) => s.featureFlags.requireDriverFromRoster);
  const activeDrivers = drivers.filter((d) => d.active);

  if (activeDrivers.length === 0 || !requireFromRoster) {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Driver</span>
        <input required value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {activeDrivers.length === 0
            ? "No drivers on file yet — add one under Admin → Drivers to select from a list next time."
            : "Typing a driver name freely — Company Settings can require picking from the roster instead."}
        </span>
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Driver</span>
      <select required value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="" disabled>
          Select a driver...
        </option>
        {activeDrivers.map((d) => (
          <option key={d.id} value={d.name}>
            {d.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function DropForm({ ticketId, requestedSize }: { ticketId: string; requestedSize: string }) {
  const dumpsters = useStore((s) => s.dumpsters);
  const dropTicket = useStore((s) => s.dropTicket);
  const idleDumpsters = dumpsters.filter((d) => d.status === "idle");
  const sizeOptions = Array.from(new Set(dumpsters.map((d) => d.size_yards))).sort(
    (a, b) => Number(a) - Number(b)
  );

  const [yardage, setYardage] = useState(requestedSize || sizeOptions[0] || "");
  const [dumpsterId, setDumpsterId] = useState("");
  const [description, setDescription] = useState("");
  const [driver, setDriver] = useState("");
  const [dropDate, setDropDate] = useState(todayISO());
  const [conditionNotes, setConditionNotes] = useState("");

  const matchingIdle = idleDumpsters.filter((d) => d.size_yards === yardage);
  const usingFallback = matchingIdle.length === 0 && idleDumpsters.length > 0;
  const displayedDumpsters = usingFallback ? idleDumpsters : matchingIdle;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dumpsterId) return;
    dropTicket(ticketId, {
      dumpster_id: dumpsterId,
      drop_description: description,
      dropped_by_driver: driver,
      drop_date: dropDate,
      drop_condition_notes: conditionNotes,
    });
  }

  return (
    <InfoCard title="Box Dropped">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Yardage Needed</span>
          <select
            value={yardage}
            onChange={(e) => {
              setYardage(e.target.value);
              setDumpsterId("");
            }}
            className={inputClass}
          >
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} yd
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {usingFallback
              ? `Box Number (no idle ${yardage}yd boxes — showing other idle sizes)`
              : "Box Number (idle, matching size)"}
          </span>
          <div className="flex flex-wrap gap-2">
            {displayedDumpsters.map((d) => {
              const matches = d.size_yards === yardage;
              const selected = dumpsterId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDumpsterId(d.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : matches
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                      : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  #{d.id} · {d.size_yards}yd
                </button>
              );
            })}
          </div>
          {idleDumpsters.length === 0 && (
            <span className="text-xs text-red-600 dark:text-red-400">No idle dumpsters available.</span>
          )}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Drop Date</span>
          <input
            type="date"
            required
            value={dropDate}
            onChange={(e) => setDropDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Where it was placed</span>
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Driveway, left side"
            className={inputClass}
          />
        </label>
        <DriverField value={driver} onChange={setDriver} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Box Condition Notes (optional)
          </span>
          <textarea
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
            placeholder="e.g. Door hinge loose, dent on side"
            rows={2}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={!dumpsterId}
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
  const [conditionNotes, setConditionNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    pickUpTicket(ticketId, {
      pickup_date: pickupDate,
      picked_up_by_driver: driver,
      pickup_condition_notes: conditionNotes,
    });
  }

  return (
    <InfoCard title="Box Picked Up">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pickup Date</span>
          <input
            type="date"
            required
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <DriverField value={driver} onChange={setDriver} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Box Condition Notes (optional)
          </span>
          <textarea
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
            placeholder="e.g. Door hinge loose, dent on side"
            rows={2}
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

function newLoad(): LiveLoad {
  return { id: `load-${Math.random().toString(36).slice(2, 9)}`, dumpster_id: "", size_yards: "", material: "" };
}

function LiveLoadCompletionForm({ ticketId, estimatedCount }: { ticketId: string; estimatedCount: string }) {
  const dumpsters = useStore((s) => s.dumpsters);
  const drivers = useStore((s) => s.drivers);
  const completeLiveLoad = useStore((s) => s.completeLiveLoad);
  const sizeOptions = Array.from(new Set(dumpsters.map((d) => d.size_yards))).sort(
    (a, b) => Number(a) - Number(b)
  );
  const activeDrivers = drivers.filter((d) => d.active);

  const initialCount = Math.min(Math.max(parseInt(estimatedCount, 10) || 1, 1), 20);
  const [loads, setLoads] = useState<LiveLoad[]>(() => Array.from({ length: initialCount }, newLoad));
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [newDriverName, setNewDriverName] = useState("");

  function updateLoad(id: string, patch: Partial<LiveLoad>) {
    setLoads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function copyFirstToAll() {
    const first = loads[0];
    if (!first) return;
    setLoads((ls) => ls.map((l, i) => (i === 0 ? l : { ...l, size_yards: first.size_yards, material: first.material })));
  }

  function addDriver(name: string) {
    const trimmed = name.trim();
    if (!trimmed || selectedDrivers.includes(trimmed)) return;
    setSelectedDrivers((d) => [...d, trimmed]);
    setNewDriverName("");
  }

  const canSubmit = loads.every((l) => l.size_yards.trim()) && selectedDrivers.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    completeLiveLoad(ticketId, { loads, drivers: selectedDrivers });
  }

  return (
    <InfoCard title="Complete Live Load">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Loads</span>
          <button
            type="button"
            onClick={copyFirstToAll}
            disabled={loads.length < 2}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          >
            Copy Load 1&apos;s size &amp; material to all
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {loads.map((load, i) => (
            <div key={load.id} className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 dark:border-slate-800 p-3">
              <label className="flex w-16 flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Load</span>
                <span className="py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">#{i + 1}</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Size (required)</span>
                <select
                  required
                  value={load.size_yards}
                  onChange={(e) => updateLoad(load.id, { size_yards: e.target.value })}
                  className={`${inputClass} w-28`}
                >
                  <option value="" disabled>
                    Select...
                  </option>
                  {sizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size} yd
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 min-w-[100px] flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Dumpster # (optional)</span>
                <input
                  value={load.dumpster_id}
                  onChange={(e) => updateLoad(load.id, { dumpster_id: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-1 min-w-[120px] flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Material</span>
                <input
                  value={load.material}
                  onChange={(e) => updateLoad(load.id, { material: e.target.value })}
                  placeholder="e.g. Brush"
                  className={inputClass}
                />
              </label>
              <button
                type="button"
                onClick={() => setLoads((ls) => ls.filter((l) => l.id !== load.id))}
                disabled={loads.length <= 1}
                className="mb-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setLoads((ls) => [...ls, newLoad()])}
          className="self-start rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          + Add Load
        </button>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Drivers (required — pick from roster or type a contracted driver&apos;s name)
          </span>
          {selectedDrivers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedDrivers.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-sm text-slate-800 dark:text-slate-200"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => setSelectedDrivers((d) => d.filter((n) => n !== name))}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    aria-label={`Remove ${name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {activeDrivers.filter((d) => !selectedDrivers.includes(d.name)).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeDrivers
                .filter((d) => !selectedDrivers.includes(d.name))
                .map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => addDriver(d.name)}
                    className="rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    + {d.name}
                  </button>
                ))}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <input
              value={newDriverName}
              onChange={(e) => setNewDriverName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDriver(newDriverName);
                }
              }}
              placeholder="New or contracted driver's name"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => addDriver(newDriverName)}
              className="shrink-0 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              + Add Driver
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="self-end rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Complete Live Load &amp; Ready to Invoice
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
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Invoice Number</span>
          <input
            required
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Invoiceable Amount ($)</span>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
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
