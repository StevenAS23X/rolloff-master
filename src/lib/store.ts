import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import {
  Account,
  AccountPermissions,
  ChangeLogEntry,
  CompanyInfo,
  Customer,
  Driver,
  Dumpster,
  DumpsterStatus,
  FeatureFlags,
  LiveLoad,
  NotificationEntry,
  Site,
  Ticket,
} from "./types";
import {
  defaultCompanyInfo,
  defaultFeatureFlags,
  seedAccounts,
  seedCustomers,
  seedDrivers,
  seedDumpsters,
  seedSites,
  seedTickets,
} from "./seed";

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
  address_line2: string;
  address_line3: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  site_address: string;
  site_address_line2: string;
  site_address_line3: string;
  site_city: string;
  site_state: string;
  site_zip: string;
  site_contact_name: string;
  site_contact_phone: string;
  requested_drop_date: string;
  box_size: string;
  material: string;
  notes: string;
  type: Ticket["type"];
  live_load_count: string;
}

interface RolloffState {
  accounts: Account[];
  currentUserId: string | null;
  customers: Customer[];
  sites: Site[];
  tickets: Ticket[];
  dumpsters: Dumpster[];
  drivers: Driver[];
  changeLog: ChangeLogEntry[];
  notifications: NotificationEntry[];
  hasHydrated: boolean;
  timeOffsetMs: number;
  companyInfo: CompanyInfo;
  featureFlags: FeatureFlags;
  login: (userId: string) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
  setTimeOffsetMs: (ms: number) => void;
  saveTicketDraft: (draftId: string | null, input: NewTicketInput) => string;
  finalizeTicketDraft: (ticketId: string) => void;
  dropTicket: (
    ticketId: string,
    data: {
      dumpster_id: string;
      drop_description: string;
      dropped_by_driver: string;
      drop_date: string;
      drop_condition_notes: string;
    }
  ) => void;
  pickUpTicket: (
    ticketId: string,
    data: { pickup_date: string; picked_up_by_driver: string; pickup_condition_notes: string }
  ) => void;
  completeLiveLoad: (ticketId: string, data: { loads: LiveLoad[]; drivers: string[] }) => void;
  invoiceTicket: (
    ticketId: string,
    data: { invoice_number: string; invoiceable_amount: string }
  ) => void;
  addDumpster: (dumpster: Omit<Dumpster, "status_history" | "service_notes">) => void;
  updateDumpster: (id: string, patch: Partial<Dumpster>) => void;
  removeDumpster: (id: string) => void;
  addDumpsterServiceNote: (id: string, note: string, createdBy: string) => void;
  markDumpsterOutOfService: (id: string, reason: string, changedBy: string) => void;
  addDriver: (driver: { name: string; phone: string }) => void;
  updateDriver: (id: string, patch: Partial<Driver>) => void;
  removeDriver: (id: string) => void;
  updateTicketFields: (id: string, patch: Partial<Ticket>) => void;
  updateTicketWithLog: (id: string, patch: Partial<Ticket>, changedBy: string) => void;
  addTicketFee: (ticketId: string, fee: { description: string; amount: number }, addedBy: string) => void;
  removeTicketFee: (ticketId: string, feeId: string) => void;
  updateCustomerFields: (id: string, patch: Partial<Customer>) => void;
  mergeCustomers: (keepId: string, mergeId: string, changedBy: string) => void;
  reassignTicketCustomer: (ticketId: string, targetCustomerId: string, changedBy: string) => void;
  updateCompanyInfo: (patch: Partial<CompanyInfo>) => void;
  setFeatureFlag: (key: keyof FeatureFlags, value: boolean) => void;
  updateAccountPermissions: (accountId: string, patch: Partial<AccountPermissions>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
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
      drivers: seedDrivers,
      changeLog: [],
      notifications: [],
      hasHydrated: false,
      timeOffsetMs: 0,
      companyInfo: defaultCompanyInfo,
      featureFlags: defaultFeatureFlags,
      login: (userId) => set({ currentUserId: userId }),
      logout: () => set({ currentUserId: null }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
      setTimeOffsetMs: (ms) => set({ timeOffsetMs: ms }),

      saveTicketDraft: (draftId, input) => {
        const state = get();
        const existingTicket = draftId ? state.tickets.find((t) => t.id === draftId) : undefined;
        const existingSite = existingTicket
          ? state.sites.find((s) => s.id === existingTicket.site_id)
          : undefined;
        const previousCustomerId = existingSite?.customer_id;

        // Always re-resolve the customer by name — re-checking on every save (not just the
        // first) is what stops a customer typed partway through from getting created for real
        // and then silently drifting away from an existing customer of the same name once the
        // rest of the name is typed.
        const nameMatch = state.customers.find(
          (c) => c.company_name.trim().toLowerCase() === input.company_name.trim().toLowerCase()
        );

        let customer: Customer;
        let customers = state.customers;
        if (nameMatch) {
          customer = {
            ...nameMatch,
            company_name: input.company_name,
            contact_name: input.contact_name,
            address: input.address,
            address_line2: input.address_line2,
            address_line3: input.address_line3,
            city: input.city,
            state: input.state,
            zip: input.zip,
            phone: input.phone,
            email: input.email,
          };
          customers = state.customers.map((c) => (c.id === nameMatch.id ? customer : c));

          // If this draft was previously linked to a *different* customer record (typically a
          // stray created from a partially-typed name before it came to match an existing
          // customer), and nothing else references it, drop it instead of leaving an orphan
          // duplicate behind.
          if (previousCustomerId && previousCustomerId !== nameMatch.id) {
            const orphaned = !state.sites.some(
              (s) => s.customer_id === previousCustomerId && s.id !== existingSite?.id
            );
            if (orphaned) customers = customers.filter((c) => c.id !== previousCustomerId);
          }
        } else {
          // No name match. If this draft already had its own customer record (and nothing
          // else references it), just rename/update it in place rather than abandoning it —
          // that's what a stray customer left behind by an earlier partial save would be.
          const previousCustomer = previousCustomerId
            ? state.customers.find((c) => c.id === previousCustomerId)
            : undefined;
          const previousCustomerSharedElsewhere =
            previousCustomerId != null &&
            state.sites.some((s) => s.customer_id === previousCustomerId && s.id !== existingSite?.id);

          if (previousCustomer && !previousCustomerSharedElsewhere) {
            customer = {
              ...previousCustomer,
              company_name: input.company_name,
              contact_name: input.contact_name,
              address: input.address,
              address_line2: input.address_line2,
              address_line3: input.address_line3,
              city: input.city,
              state: input.state,
              zip: input.zip,
              phone: input.phone,
              email: input.email,
            };
            customers = state.customers.map((c) => (c.id === previousCustomer.id ? customer : c));
          } else {
            customer = {
              id: newId("cust"),
              company_name: input.company_name,
              contact_name: input.contact_name,
              address: input.address,
              address_line2: input.address_line2,
              address_line3: input.address_line3,
              city: input.city,
              state: input.state,
              zip: input.zip,
              phone: input.phone,
              email: input.email,
            };
            customers = [...customers, customer];
          }
        }

        let site: Site;
        let sites = state.sites;
        if (existingSite) {
          site = {
            ...existingSite,
            customer_id: customer.id,
            site_address: input.site_address,
            site_address_line2: input.site_address_line2,
            site_address_line3: input.site_address_line3,
            site_city: input.site_city,
            site_state: input.site_state,
            site_zip: input.site_zip,
            site_contact_name: input.site_contact_name,
            site_contact_phone: input.site_contact_phone,
          };
          sites = state.sites.map((s) => (s.id === existingSite.id ? site : s));
        } else {
          site = {
            id: newId("site"),
            customer_id: customer.id,
            site_address: input.site_address,
            site_address_line2: input.site_address_line2,
            site_address_line3: input.site_address_line3,
            site_city: input.site_city,
            site_state: input.site_state,
            site_zip: input.site_zip,
            site_contact_name: input.site_contact_name,
            site_contact_phone: input.site_contact_phone,
          };
          sites = [...sites, site];
        }

        let ticket: Ticket;
        let tickets = state.tickets;
        if (existingTicket) {
          ticket = {
            ...existingTicket,
            site_id: site.id,
            date_of_order: input.date_of_order,
            type: input.type,
            box_size: input.box_size,
            material: input.material,
            notes: input.notes,
            requested_drop_date: input.requested_drop_date,
            live_load_count: input.live_load_count,
          };
          tickets = state.tickets.map((t) => (t.id === existingTicket.id ? ticket : t));
        } else {
          ticket = {
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
            drop_condition_notes: "",
            pickup_date: null,
            picked_up_by_driver: "",
            pickup_condition_notes: "",
            invoiced: false,
            invoice_number: "",
            invoiceable_amount: "",
            additionalFees: [],
            live_load_count: input.live_load_count,
            loads: [],
            live_load_drivers: [],
          };
          tickets = [...tickets, ticket];
        }

        set({ customers, sites, tickets });
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
                  drop_condition_notes: data.drop_condition_notes,
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
                  pickup_condition_notes: data.pickup_condition_notes,
                }
              : t
          ),
        });
      },

      completeLiveLoad: (ticketId, data) => {
        const state = get();
        set({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: "ready-to-invoice",
                  loads: data.loads,
                  live_load_drivers: data.drivers,
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
              service_notes: [],
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

      addDumpsterServiceNote: (id, note, createdBy) => {
        const state = get();
        set({
          dumpsters: state.dumpsters.map((d) =>
            d.id === id
              ? {
                  ...d,
                  service_notes: [
                    ...d.service_notes,
                    { id: newId("svc"), note, createdAt: new Date().toISOString(), createdBy },
                  ],
                }
              : d
          ),
        });
      },

      markDumpsterOutOfService: (id, reason, changedBy) => {
        const state = get();
        const trimmedReason = reason.trim();
        const dumpsters = withDumpsterStatus(state.dumpsters, id, "out-of-service").map((d) =>
          d.id === id && trimmedReason
            ? {
                ...d,
                service_notes: [
                  ...d.service_notes,
                  { id: newId("svc"), note: trimmedReason, createdAt: new Date().toISOString(), createdBy: changedBy },
                ],
              }
            : d
        );
        set({
          dumpsters,
          notifications: [
            {
              id: newId("notif"),
              message: `${changedBy} marked box #${id} out of service${trimmedReason ? `: ${trimmedReason}` : "."}`,
              createdAt: new Date().toISOString(),
              read: false,
              dumpsterId: id,
            },
            ...state.notifications,
          ],
        });
      },

      addDriver: (driver) => {
        const state = get();
        set({
          drivers: [...state.drivers, { id: newId("drv"), name: driver.name, phone: driver.phone, active: true }],
        });
      },

      updateDriver: (id, patch) => {
        const state = get();
        set({
          drivers: state.drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        });
      },

      removeDriver: (id) => {
        const state = get();
        set({ drivers: state.drivers.filter((d) => d.id !== id) });
      },

      updateTicketFields: (id, patch) => {
        const state = get();
        set({
          tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        });
      },

      updateTicketWithLog: (id, patch, changedBy) => {
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

      addTicketFee: (ticketId, fee, addedBy) => {
        const state = get();
        set({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  additionalFees: [
                    ...t.additionalFees,
                    {
                      id: newId("fee"),
                      description: fee.description,
                      amount: fee.amount,
                      addedBy,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : t
          ),
        });
      },

      removeTicketFee: (ticketId, feeId) => {
        const state = get();
        set({
          tickets: state.tickets.map((t) =>
            t.id === ticketId ? { ...t, additionalFees: t.additionalFees.filter((f) => f.id !== feeId) } : t
          ),
        });
      },

      updateCustomerFields: (id, patch) => {
        const state = get();
        set({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        });
      },

      mergeCustomers: (keepId, mergeId, changedBy) => {
        const state = get();
        if (keepId === mergeId) return;
        const keep = state.customers.find((c) => c.id === keepId);
        const merged = state.customers.find((c) => c.id === mergeId);
        if (!keep || !merged) return;
        const movedSites = state.sites.filter((s) => s.customer_id === mergeId).length;
        set({
          sites: state.sites.map((s) => (s.customer_id === mergeId ? { ...s, customer_id: keepId } : s)),
          customers: state.customers.filter((c) => c.id !== mergeId),
          changeLog: [
            ...state.changeLog,
            {
              id: newId("log"),
              entityType: "customer",
              entityId: keepId,
              field: "merged_customer",
              oldValue: `${merged.company_name} (${movedSites} site${movedSites === 1 ? "" : "s"} moved)`,
              newValue: keep.company_name,
              changedBy,
              changedAt: new Date().toISOString(),
            },
          ],
        });
      },

      reassignTicketCustomer: (ticketId, targetCustomerId, changedBy) => {
        const state = get();
        const ticket = state.tickets.find((t) => t.id === ticketId);
        if (!ticket) return;
        const currentSite = state.sites.find((s) => s.id === ticket.site_id);
        if (!currentSite) return;
        const targetCustomer = state.customers.find((c) => c.id === targetCustomerId);
        if (!targetCustomer) return;
        const fromCustomer = state.customers.find((c) => c.id === currentSite.customer_id);

        // Clone the site under the new customer rather than repointing it in place — the
        // original site (and any other tickets on it) stays with the original customer.
        const newSite: Site = { ...currentSite, id: newId("site"), customer_id: targetCustomerId };

        set({
          sites: [...state.sites, newSite],
          tickets: state.tickets.map((t) => (t.id === ticketId ? { ...t, site_id: newSite.id } : t)),
          changeLog: [
            ...state.changeLog,
            {
              id: newId("log"),
              entityType: "ticket",
              entityId: ticketId,
              field: "customer",
              oldValue: fromCustomer?.company_name ?? "Unknown",
              newValue: targetCustomer.company_name,
              changedBy,
              changedAt: new Date().toISOString(),
            },
          ],
        });
      },

      updateCompanyInfo: (patch) => {
        const state = get();
        set({ companyInfo: { ...state.companyInfo, ...patch } });
      },

      setFeatureFlag: (key, value) => {
        const state = get();
        set({ featureFlags: { ...state.featureFlags, [key]: value } });
      },

      updateAccountPermissions: (accountId, patch) => {
        const state = get();
        set({
          accounts: state.accounts.map((a) =>
            a.id === accountId ? { ...a, permissions: { ...a.permissions, ...patch } } : a
          ),
        });
      },

      markNotificationRead: (id) => {
        const state = get();
        set({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        });
      },

      markAllNotificationsRead: () => {
        const state = get();
        set({ notifications: state.notifications.map((n) => ({ ...n, read: true })) });
      },
    }),
    {
      name: "rolloff-data",
      version: 7,
      migrate: (persistedState) => {
        const state = persistedState as Partial<RolloffState>;
        if (Array.isArray(state.dumpsters)) {
          state.dumpsters = state.dumpsters.map((d) => {
            const withHistory =
              Array.isArray(d.status_history) && d.status_history.length > 0
                ? d
                : { ...d, status_history: [{ status: d.status, since: new Date().toISOString() }] };
            return Array.isArray(withHistory.service_notes)
              ? withHistory
              : { ...withHistory, service_notes: [] };
          });
        }
        if (!Array.isArray(state.changeLog)) state.changeLog = [];
        if (typeof state.timeOffsetMs !== "number") state.timeOffsetMs = 0;
        if (!Array.isArray(state.drivers)) state.drivers = seedDrivers;
        if (Array.isArray(state.customers)) {
          state.customers = state.customers.map((c) => {
            const raw = c as Partial<Customer>;
            return {
              ...c,
              address_line2: raw.address_line2 ?? "",
              address_line3: raw.address_line3 ?? "",
              zip: raw.zip ?? "",
            };
          });
        }
        if (Array.isArray(state.sites)) {
          state.sites = state.sites.map((s) => {
            const raw = s as Partial<Site>;
            return {
              ...s,
              site_address_line2: raw.site_address_line2 ?? "",
              site_address_line3: raw.site_address_line3 ?? "",
              site_city: raw.site_city ?? "",
              site_state: raw.site_state ?? "",
              site_zip: raw.site_zip ?? "",
            };
          });
        }
        if (!state.companyInfo) state.companyInfo = defaultCompanyInfo;
        if (!state.featureFlags) {
          state.featureFlags = defaultFeatureFlags;
        } else {
          state.featureFlags = { ...defaultFeatureFlags, ...state.featureFlags };
        }
        if (!Array.isArray(state.notifications)) state.notifications = [];
        if (Array.isArray(state.tickets)) {
          state.tickets = state.tickets.map((t) => {
            const raw = t as Partial<Ticket>;
            return {
              ...t,
              drop_condition_notes: raw.drop_condition_notes ?? "",
              pickup_condition_notes: raw.pickup_condition_notes ?? "",
              additionalFees: Array.isArray(raw.additionalFees) ? raw.additionalFees : [],
              live_load_count: raw.live_load_count ?? "",
              loads: Array.isArray(raw.loads) ? raw.loads : [],
              live_load_drivers: Array.isArray(raw.live_load_drivers) ? raw.live_load_drivers : [],
            };
          });
        }
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
