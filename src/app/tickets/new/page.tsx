"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, NewTicketInput } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { DatePicker } from "@/components/DatePicker";
import { todayISO } from "@/lib/timer";
import { formatPhoneInput } from "@/lib/phone";
import { TICKET_TYPE_LABELS } from "@/lib/ticketType";
import { parseCityState } from "@/lib/usStates";
import { hasLeadingStreetNumber } from "@/lib/address";
import { dateToISODate, formatDisplayDate } from "@/lib/calendarUtil";
import { Customer, Site, Ticket, TicketType } from "@/lib/types";

const emptyForm: NewTicketInput = {
  date_of_order: todayISO(),
  company_name: "",
  contact_name: "",
  address: "",
  address_line2: "",
  address_line3: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  site_address: "",
  site_address_line2: "",
  site_address_line3: "",
  site_city: "",
  site_state: "",
  site_zip: "",
  site_contact_name: "",
  site_contact_phone: "",
  requested_drop_date: "",
  box_size: "",
  material: "",
  notes: "",
  type: "residential",
};

function minRequestedDropDate(dateOfOrder: string): string {
  const today = todayISO();
  return dateOfOrder > today ? dateOfOrder : today;
}

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
    address_line2: customer?.address_line2 ?? "",
    address_line3: customer?.address_line3 ?? "",
    city: customer?.city ?? "",
    state: customer?.state ?? "",
    zip: customer?.zip ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    site_address: site?.site_address ?? "",
    site_address_line2: site?.site_address_line2 ?? "",
    site_address_line3: site?.site_address_line3 ?? "",
    site_city: site?.site_city ?? "",
    site_state: site?.site_state ?? "",
    site_zip: site?.site_zip ?? "",
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
  const [addressError, setAddressError] = useState<string | null>(null);
  const [siteAddressError, setSiteAddressError] = useState<string | null>(null);

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
      address_line2: c.address_line2,
      address_line3: c.address_line3,
      city: c.city,
      state: c.state,
      zip: c.zip,
      phone: c.phone,
      email: c.email,
    }));
    setShowSuggestions(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const addressInvalid = !hasLeadingStreetNumber(form.address);
    const siteAddressInvalid = !hasLeadingStreetNumber(form.site_address);
    setAddressError(addressInvalid ? "Enter a full street address, starting with the street number." : null);
    setSiteAddressError(
      siteAddressInvalid ? "Enter a full street address, starting with the street number." : null
    );
    if (addressInvalid || siteAddressInvalid) return;

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
        Type a company name to autofill a repeat customer. Site details are entered fresh each time.
      </p>
      <p className="mb-6 text-xs font-medium text-slate-400">
        {savedAt || resumeId ? "Draft saved." : "Draft saves automatically as you type."}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormSection title="Order">
          <Field label="Date of Order">
            <DatePicker
              required
              value={form.date_of_order}
              onChange={(v) => {
                setForm((f) => {
                  const minDrop = minRequestedDropDate(v);
                  return {
                    ...f,
                    date_of_order: v,
                    requested_drop_date:
                      f.requested_drop_date && f.requested_drop_date < minDrop
                        ? ""
                        : f.requested_drop_date,
                  };
                });
              }}
              confirmMessage={(day) =>
                todayISO() !== dateToISODate(day)
                  ? `Set the order date to ${formatDisplayDate(day)} instead of today?`
                  : null
              }
              className={inputClass}
            />
          </Field>
          <Field label="Requested Drop Date">
            <DatePicker
              required
              value={form.requested_drop_date}
              onChange={(v) => update("requested_drop_date", v)}
              minDate={minRequestedDropDate(form.date_of_order)}
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
                        onClick={() => applyCustomer(c.id)}
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
          <Field label="Address" error={addressError}>
            <AddressAutocomplete
              value={form.address}
              onChange={(v) => {
                update("address", v);
                if (addressError) setAddressError(null);
              }}
              onSelect={({ city, state, zip }) => {
                setForm((f) => ({
                  ...f,
                  city: city ?? f.city,
                  state: state ?? f.state,
                  zip: zip ?? f.zip,
                }));
              }}
              onBlurValue={(v) => {
                if (form.city.trim() && form.state.trim() && form.zip.trim()) return;
                const parsed = parseCityState(v);
                if (!parsed.city && !parsed.state && !parsed.zip) return;
                setForm((f) => ({
                  ...f,
                  city: f.city.trim() ? f.city : parsed.city ?? f.city,
                  state: f.state.trim() ? f.state : parsed.state ?? f.state,
                  zip: f.zip.trim() ? f.zip : parsed.zip ?? f.zip,
                }));
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Address Line 2">
            <input
              value={form.address_line2}
              onChange={(e) => update("address_line2", e.target.value)}
              placeholder="Suite, unit, floor, etc. (optional)"
              className={inputClass}
            />
          </Field>
          <Field label="Address Line 3">
            <input
              value={form.address_line3}
              onChange={(e) => update("address_line3", e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <Field label="Zip Code">
              <input
                value={form.zip}
                onChange={(e) => update("zip", e.target.value.replace(/[^\d-]/g, "").slice(0, 10))}
                inputMode="numeric"
                placeholder="33602"
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Site Info">
          <Field label="Site Address" error={siteAddressError}>
            <AddressAutocomplete
              value={form.site_address}
              onChange={(v) => {
                update("site_address", v);
                if (siteAddressError) setSiteAddressError(null);
              }}
              onSelect={({ city, state, zip }) => {
                setForm((f) => ({
                  ...f,
                  site_city: city ?? f.site_city,
                  site_state: state ?? f.site_state,
                  site_zip: zip ?? f.site_zip,
                }));
              }}
              onBlurValue={(v) => {
                if (form.site_city.trim() && form.site_state.trim() && form.site_zip.trim()) return;
                const parsed = parseCityState(v);
                if (!parsed.city && !parsed.state && !parsed.zip) return;
                setForm((f) => ({
                  ...f,
                  site_city: f.site_city.trim() ? f.site_city : parsed.city ?? f.site_city,
                  site_state: f.site_state.trim() ? f.site_state : parsed.state ?? f.site_state,
                  site_zip: f.site_zip.trim() ? f.site_zip : parsed.zip ?? f.site_zip,
                }));
              }}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Site Address Line 2">
            <input
              value={form.site_address_line2}
              onChange={(e) => update("site_address_line2", e.target.value)}
              placeholder="Suite, unit, floor, etc. (optional)"
              className={inputClass}
            />
          </Field>
          <Field label="Site Address Line 3">
            <input
              value={form.site_address_line3}
              onChange={(e) => update("site_address_line3", e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Site City">
              <input
                value={form.site_city}
                onChange={(e) => update("site_city", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Site State">
              <input
                value={form.site_state}
                onChange={(e) => update("site_state", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Site Zip Code">
              <input
                value={form.site_zip}
                onChange={(e) => update("site_zip", e.target.value.replace(/[^\d-]/g, "").slice(0, 10))}
                inputMode="numeric"
                placeholder="33602"
                className={inputClass}
              />
            </Field>
          </div>
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

        <FormSection title="Details">
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}
