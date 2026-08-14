import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import { Account, ChangeLogEntry, Customer, Dumpster, DumpsterStatus, Site, Ticket } from "./types";
import { seedAccounts, seedCustomers, seedDumpsters, seedSites, seedTickets } from "./seed";

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function withDumpsterStatus(dumpsters: Dumpster[], id: string, status: DumpsterStatus): Dumpster[] {
  return dumpsters.map((d) => {
    if (d.id !== id || d.status === status) return d;
    return {
      ...d,
      status,
      status_history: [...d.status_history, { status, since: new Date().toISOString() }],
    };
  });
}

function diffToLogEntries(
  entityType: ChangeLogEntry["entityType"],
  entityId: string,
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
  changedBy: string
): ChangeLogEntry[] {
  const entries: ChangeLogEntry[] = [];
  for (const field of Object.keys(patch)) {
    const oldValue = before[field];
    const newValue = patch[field];
    if (oldValue === newValue) continue;
    entries.push({
      id: newId("log"),
      entityType,
      entityId,
      field,
      oldValue: oldValue === null || oldValue === undefined ? "" : String(oldValue),
      newValue: newValue === null || newValue === undefined ? "" : String(newValue),
      changedBy,
      changedAt: new Date().toISOString(),
    });
  }
  return entries;
}

export interface NewTicketInput {
  date_of_order: string;
  company_name: string;
  contact_name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  site_address: string;
  site_contact_name: string;
  site_contact_phone: string;
  requested_drop_date: string;
  box_size: string;
  material: string;
  notes: string;
  type: Ticket["type"];
}

interface RolloffState {
  accounts: Account[];
  currentUserId: string | null;
  customers: Customer[];
  sites: Site[];
  tickets: Ticket[];
  dumpsters: Dumpster[];
  changeLog: ChangeLogEntry[];
  hasHydrated: boolean;
  timeOffsetMs: number;
  login: (userId: string) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
  setTimeOffsetMs: (ms: number) => void;
  saveTicketDraft: (draftId: string | null, input: NewTicketInput) => string;
  finalizeTicketDraft: (ticketId: string) => void;
  dropTicket: (
    ticketId: string,
    data: { dumpster_id: string; drop_description: string; dropped_by_driver: string; drop_date: string }
  ) => void;
  pickUpTicket: (
    ticketId: string,
    data: { pickup_date: string; picked_up_by_driver: string }
  ) => void;
  invoiceTicket: (
    ticketId: string,
    data: { invoice_number: string; invoiceable_amount: string }
  ) => void;
  addDumpster: (dumpster: Omit<Dumpster, "status_history">) => void;
  updateDumpster: (id: string, patch: Partial<Dumpster>) => void;
  removeDumpster: (id: string) => void;
  updateTicketFields: (id: string, patch: Partial<Ticket>) => void;
  adminUpdateTicket: (id: string, patch: Partial<Ticket>, changedBy: string) => void;
  updateCustomerFields: (id: string, patch: Partial<Customer>) => void;
}

export const useStore = create<RolloffState>()(
  persist(
    (set, get) => ({
      accounts: seedAccounts,
      currentUserId: seedAccounts[1]?.id ?? null,
      customers: seedCustomers,
      sites: seedSites,
      tickets: seedTickets,
      dumpsters: seedDumpsters,
      changeLog: [],
      hasHydrated: false,
      timeOffsetMs: 0,
      login: (userId) => set({ currentUserId: userId }),
      logout: () => set({ currentUserId: null }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
      setTimeOffsetMs: (ms) => set({ timeOffsetMs: ms }),

      saveTicketDraft: (draftId, input) => {
        const state = get();
        const existingTicket = draftId ? state.tickets.find((t) => t.id === draftId) : undefined;

        if (existingTicket) {
          const existingSite = state.sites.find((s) => s.id === existingTicket.site_id);
          set({
            customers: existingSite
              ? state.customers.map((c) =>
                  c.id === existingSite.customer_id
                    ? {
                        ...c,
                        company_name: input.company_name,
                        contact_name: input.contact_name,
                        address: input.address,
                        city: input.city,
                        state: input.state,
                        phone: input.phone,
                        email: input.email,
                      }
                    : c
                )
              : state.customers,
            sites: state.sites.map((s) =>
              s.id === existingTicket.site_id
                ? {
                    ...s,
                    site_address: input.site_address,
                    site_contact_name: input.site_contact_name,
                    site_contact_phone: input.site_contact_phone,
                  }
                : s
            ),
            tickets: state.tickets.map((t) =>
              t.id === existingTicket.id
                ? {
                    ...t,
                    date_of_order: input.date_of_order,
                    type: input.type,
                    box_size: input.box_size,
                    material: input.material,
                    notes: input.notes,
                    requested_drop_date: input.requested_drop_date,
                  }
                : t
            ),
          });
          return existingTicket.id;
        }

        let customer = state.customers.find(
          (c) => c.company_name.trim().toLowerCase() === input.company_name.trim().toLowerCase()
        );

        let customers = state.customers;
        if (!customer) {
          customer = {
            id: newId("cust"),
            company_name: input.company_name,
            contact_name: input.contact_name,
            address: input.address,
            city: input.city,
            state: input.state,
            phone: input.phone,
            email: input.email,
          };
          customers = [...customers, customer];
        }

        const site: Site = {
          id: newId("site"),
          customer_id: customer.id,
          site_address: input.site_address,
          site_contact_name: input.site_contact_name,
          site_contact_phone: input.site_contact_phone,
        };

        const ticket: Ticket = {
          id: newId("tkt"),
          site_id: site.id,
          date_of_order: input.date_of_order,
          type: input.type,
          box_size: input.box_size,
          material: input.material,
          notes: input.notes,
          requested_drop_date: input.requested_drop_date,
          dumpster_id: null,
          status: "draft",
          drop_date: null,
          drop_description: "",
          dropped_by_driver: "",
          pickup_date: null,
          picked_up_by_driver: "",
          invoiced: false,
          invoice_number: "",
          invoiceable_amount: "",
        };

        set({
          customers,
          sites: [...state.sites, site],
          tickets: [...state.tickets, ticket],
        });

        return ticket.id;
      },

      finalizeTicketDraft: (ticketId) => {
        const state = get();
        set({
          tickets: state.tickets.map((t) => (t.id === ticketId ? { ...t, status: "order-taken" } : t)),
        });
      },

      dropTicket: (ticketId, data) => {
        const state = get();
        set({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: "dropped",
                  dumpster_id: data.dumpster_id,
                  drop_description: data.drop_description,
                  dropped_by_driver: data.dropped_by_driver,
                  drop_date: data.drop_date,
                }
              : t
          ),
          dumpsters: withDumpsterStatus(state.dumpsters, data.dumpster_id, "in-service"),
        });
      },

      pickUpTicket: (ticketId, data) => {
        const state = get();
        set({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: "ready-to-invoice",
                  pickup_date: data.pickup_date,
                  picked_up_by_driver: data.picked_up_by_driver,
                }
              : t
          ),
        });
      },

      invoiceTicket: (ticketId, data) => {
        const state = get();
        const ticket = state.tickets.find((t) => t.id === ticketId);
        set({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: "archived",
                  invoiced: true,
                  invoice_number: data.invoice_number,
                  invoiceable_amount: data.invoiceable_amount,
                }
              : t
          ),
          dumpsters: ticket?.dumpster_id
            ? withDumpsterStatus(state.dumpsters, ticket.dumpster_id, "idle")
            : state.dumpsters,
        });
      },

      addDumpster: (dumpster) => {
        const state = get();
        if (state.dumpsters.some((d) => d.id === dumpster.id)) return;
        set({
          dumpsters: [
            ...state.dumpsters,
            {
              ...dumpster,
              status_history: [{ status: dumpster.status, since: new Date().toISOString() }],
            },
          ],
        });
      },

      updateDumpster: (id, patch) => {
        const state = get();
        const dumpsters = patch.status
          ? withDumpsterStatus(state.dumpsters, id, patch.status)
          : state.dumpsters;
        set({
          dumpsters: dumpsters.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        });
      },

      removeDumpster: (id) => {
        const state = get();
        set({ dumpsters: state.dumpsters.filter((d) => d.id !== id) });
      },

      updateTicketFields: (id, patch) => {
        const state = get();
        set({
          tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        });
      },

      adminUpdateTicket: (id, patch, changedBy) => {
        const state = get();
        const ticket = state.tickets.find((t) => t.id === id);
        if (!ticket) return;
        const entries = diffToLogEntries(
          "ticket",
          id,
          ticket as unknown as Record<string, unknown>,
          patch as Record<string, unknown>,
          changedBy
        );
        set({
          tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          changeLog: entries.length > 0 ? [...entries, ...state.changeLog] : state.changeLog,
        });
      },

      updateCustomerFields: (id, patch) => {
        const state = get();
        set({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        });
      },
    }),
    {
      name: "rolloff-data",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<RolloffState>;
        if (Array.isArray(state.dumpsters)) {
          state.dumpsters = state.dumpsters.map((d) =>
            Array.isArray(d.status_history) && d.status_history.length > 0
              ? d
              : { ...d, status_history: [{ status: d.status, since: new Date().toISOString() }] }
          );
        }
        if (!Array.isArray(state.changeLog)) state.changeLog = [];
        if (typeof state.timeOffsetMs !== "number") state.timeOffsetMs = 0;
        return state;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function useCurrentAccount(): Account | null {
  const accounts = useStore((s) => s.accounts);
  const currentUserId = useStore((s) => s.currentUserId);
  return accounts.find((a) => a.id === currentUserId) ?? null;
}

/** Simulated "now" — offset by the temporary dashboard time accelerator. */
export function useOffsetNow(): Date {
  const timeOffsetMs = useStore((s) => s.timeOffsetMs);
  const [wallClockMs, setWallClockMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setWallClockMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return new Date(wallClockMs + timeOffsetMs);
}
