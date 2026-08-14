"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, NewTicketInput } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { todayISO } from "@/lib/timer";

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

export default function NewTicketPage() {
  return (
    <Hydrated>
      <NewTicketForm />
    </Hydrated>
  );
}

function NewTicketForm() {
  const router = useRouter();
  const customers = useStore((s) => s.customers);
  const createTicket = useStore((s) => s.createTicket);
  const [form, setForm] = useState<NewTicketInput>(emptyForm);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    const id = createTicket(form);
    router.push(`/tickets/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">New Ticket — Order Taken</h1>
      <p className="mb-6 text-sm text-slate-500">
        Start typing a company name to autofill an existing customer. Site details are always
        entered fresh.
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
          <Field label="Residential or Commercial">
            <div className="flex gap-3">
              {(["residential", "commercial"] as const).map((t) => (
                <label
                  key={t}
                  className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm font-medium capitalize ${
                    form.type === t
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    className="sr-only"
                    checked={form.type === t}
                    onChange={() => update("type", t)}
                  />
                  {t} ({t === "residential" ? "14" : "30"}-day timer)
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
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Start typing to find a repeat customer..."
                className={inputClass}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                  {suggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onMouseDown={() => applyCustomer(c.id)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                required
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
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
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
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
            <input
              required
              value={form.site_address}
              onChange={(e) => update("site_address", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Site Contact Name">
              <input
                value={form.site_contact_name}
                onChange={(e) => update("site_contact_name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Site Contact Phone">
              <input
                value={form.site_contact_phone}
                onChange={(e) => update("site_contact_phone", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Box Details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Box Size (yards)">
              <input
                required
                value={form.box_size}
                onChange={(e) => update("box_size", e.target.value)}
                placeholder="e.g. 20"
                className={inputClass}
              />
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
