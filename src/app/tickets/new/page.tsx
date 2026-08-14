"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, NewTicketInput } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { todayISO } from "@/lib/timer";
import { formatPhoneInput } from "@/lib/phone";
import { TICKET_TYPE_LABELS } from "@/lib/ticketType";
import { Customer, Site, Ticket, TicketType } from "@/lib/types";

const emptyForm: NewTicketInput = {
  date_of_order: todayISO(),
  company_name: "",
  contact_name: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  site_address: "",
  site_contact_name: "",
  site_contact_phone: "",
  requested_drop_date: "",
  box_size: "",
  material: "",
  notes: "",
  type: "residential",
};

const TYPE_OPTIONS: { value: TicketType; label: string }[] = (
  ["residential", "commercial", "live-load"] as const
).map((value) => ({ value, label: TICKET_TYPE_LABELS[value] }));

function buildDraftForm(
  resumeId: string | null,
  tickets: Ticket[],
  sites: Site[],
  customers: Customer[]
): NewTicketInput {
  const ticket = resumeId ? tickets.find((t) => t.id === resumeId) : undefined;
  if (!ticket) return emptyForm;
  const site = sites.find((s) => s.id === ticket.site_id);
  const customer = site ? customers.find((c) => c.id === site.customer_id) : undefined;
  return {
    date_of_order: ticket.date_of_order,
    company_name: customer?.company_name ?? "",
    contact_name: customer?.contact_name ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
    state: customer?.state ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    site_address: site?.site_address ?? "",
    site_contact_name: site?.site_contact_name ?? "",
    site_contact_phone: site?.site_contact_phone ?? "",
    requested_drop_date: ticket.requested_drop_date,
    box_size: ticket.box_size,
    material: ticket.material,
    notes: ticket.notes,
    type: ticket.type,
  };
}

export default function NewTicketPage() {
  return (
    <Hydrated>
      <Suspense fallback={null}>
        <NewTicketForm />
      </Suspense>
    </Hydrated>
  );
}

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("draft");

  const customers = useStore((s) => s.customers);
  const sites = useStore((s) => s.sites);
  const tickets = useStore((s) => s.tickets);
  const dumpsters = useStore((s) => s.dumpsters);
  const saveTicketDraft = useStore((s) => s.saveTicketDraft);
  const finalizeTicketDraft = useStore((s) => s.finalizeTicketDraft);

  const boxSizeOptions = useMemo(
    () =>
      Array.from(new Set(dumpsters.map((d) => d.size_yards))).sort((a, b) => Number(a) - Number(b)),
    [dumpsters]
  );

  const [form, setForm] = useState<NewTicketInput>(() =>
    buildDraftForm(resumeId, tickets, sites, customers)
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const draftIdRef = useRef<string | null>(
    resumeId && tickets.some((t) => t.id === resumeId) ? resumeId : null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!form.company_name.trim() && !form.site_address.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const id = saveTicketDraft(draftIdRef.current, form);
      draftIdRef.current = id;
      setSavedAt(Date.now());
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const suggestions = useMemo(() => {
    const q = form.company_name.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => c.company_name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [customers, form.company_name]);

  function update<K extends keyof NewTicketInput>(key: K, value: NewTicketInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyCustomer(id: string) {
    const c = customers.find((c) => c.id === id);
    if (!c) return;
    setForm((f) => ({
      ...f,
      company_name: c.company_name,
      contact_name: c.contact_name,
      address: c.address,
      city: c.city,
      state: c.state,
      phone: c.phone,
      email: c.email,
    }));
    setShowSuggestions(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const id = saveTicketDraft(draftIdRef.current, form);
    finalizeTicketDraft(id);
    router.push(`/tickets/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        {resumeId ? "Resume Draft Ticket" : "New Ticket — Order Taken"}
      </h1>
      <p className="mb-1 text-sm text-slate-500">
        Start typing a company name to autofill an existing customer. Site details are always
        entered fresh. Address fields suggest matches as you type — keep typing your own text
        and click away to ignore them.
      </p>
      <p className="mb-6 text-xs font-medium text-slate-400">
        {savedAt || resumeId
          ? "Saved as a draft — safe to leave and come back from the Tickets list."
          : "Your progress saves automatically as a draft once you start typing."}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormSection title="Order">
          <Field label="Date of Order">
            <input
              type="date"
              required
              value={form.date_of_order}
              onChange={(e) => update("date_of_order", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Requested Drop Date">
            <input
              type="date"
              required
              value={form.requested_drop_date}
              onChange={(e) => update("requested_drop_date", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Ticket Type">
            <div className="flex gap-3">
              {TYPE_OPTIONS.map((t) => (
                <label
                  key={t.value}
                  className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm font-medium ${
                    form.type === t.value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    className="sr-only"
                    checked={form.type === t.value}
                    onChange={() => update("type", t.value)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </Field>
        </FormSection>

        <FormSection title="Customer / Billing">
          <Field label="Company Name">
            <div className="relative">
              <input
                required
                value={form.company_name}
                onChange={(e) => {
                  update("company_name", e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                placeholder="Start typing to find a repeat customer..."
                className={inputClass}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {suggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          applyCustomer(c.id);
                        }}
                        className="block w-full touch-manipulation px-3 py-3 text-left text-sm hover:bg-slate-50 active:bg-slate-100"
                      >
                        <span className="font-medium text-slate-900">{c.company_name}</span>{" "}
                        <span className="text-slate-400">— {c.contact_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>
          <Field label="Contact Name">
            <input
              required
              value={form.contact_name}
              onChange={(e) => update("contact_name", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", formatPhoneInput(e.target.value))}
                placeholder="(813) 555-0142"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Address">
            <AddressAutocomplete
              value={form.address}
              onChange={(v) => update("address", v)}
              onSelect={({ city, state }) => {
                setForm((f) => ({ ...f, city: city ?? f.city, state: state ?? f.state }));
              }}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              <input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="State">
              <input
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Site (entered fresh every time)">
          <Field label="Site Address">
            <AddressAutocomplete
              value={form.site_address}
              onChange={(v) => update("site_address", v)}
              className={inputClass}
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Site Contact Name">
              <input
                value={form.site_contact_name}
                onChange={(e) => update("site_contact_name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Site Contact Phone">
              <input
                type="tel"
                value={form.site_contact_phone}
                onChange={(e) => update("site_contact_phone", formatPhoneInput(e.target.value))}
                placeholder="(813) 555-0177"
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Box Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Box Size (yards)">
              <select
                required
                value={form.box_size}
                onChange={(e) => update("box_size", e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a size...
                </option>
                {boxSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} yd
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Material">
              <input
                required
                value={form.material}
                onChange={(e) => update("material", e.target.value)}
                placeholder="e.g. Construction debris"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Gate access, gate code, leave on street, etc."
              rows={3}
              className={inputClass}
            />
          </Field>
        </FormSection>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Create Ticket
          </button>
        </div>
      </form>
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
