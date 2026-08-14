import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Customer, Dumpster, Role, Site, Ticket } from "./types";
import { seedCustomers, seedDumpsters, seedSites, seedTickets } from "./seed";

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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
  role: Role;
  customers: Customer[];
  sites: Site[];
  tickets: Ticket[];
  dumpsters: Dumpster[];
  hasHydrated: boolean;
  setRole: (role: Role) => void;
  setHasHydrated: (v: boolean) => void;
  createTicket: (input: NewTicketInput) => string;
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
  addDumpster: (dumpster: Dumpster) => void;
  updateDumpster: (id: string, patch: Partial<Dumpster>) => void;
  removeDumpster: (id: string) => void;
  updateTicketFields: (id: string, patch: Partial<Ticket>) => void;
}

export const useStore = create<RolloffState>()(
  persist(
    (set, get) => ({
      role: "dispatch",
      customers: seedCustomers,
      sites: seedSites,
      tickets: seedTickets,
      dumpsters: seedDumpsters,
      hasHydrated: false,
      setRole: (role) => set({ role }),
      setHasHydrated: (v) => set({ hasHydrated: v }),

      createTicket: (input) => {
        const state = get();
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
          status: "order-taken",
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
          dumpsters: state.dumpsters.map((d) =>
            d.id === data.dumpster_id ? { ...d, status: "in-service" } : d
          ),
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
            ? state.dumpsters.map((d) => (d.id === ticket.dumpster_id ? { ...d, status: "idle" } : d))
            : state.dumpsters,
        });
      },

      addDumpster: (dumpster) => {
        const state = get();
        if (state.dumpsters.some((d) => d.id === dumpster.id)) return;
        set({ dumpsters: [...state.dumpsters, dumpster] });
      },

      updateDumpster: (id, patch) => {
        const state = get();
        set({
          dumpsters: state.dumpsters.map((d) => (d.id === id ? { ...d, ...patch } : d)),
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
    }),
    {
      name: "rolloff-data",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
