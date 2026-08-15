import { Customer, Site, Ticket } from "./types";

export function getSite(sites: Site[], siteId: string): Site | undefined {
  return sites.find((s) => s.id === siteId);
}

export function getCustomer(customers: Customer[], customerId: string): Customer | undefined {
  return customers.find((c) => c.id === customerId);
}

export function ticketCustomer(
  ticket: Ticket,
  sites: Site[],
  customers: Customer[]
): { site?: Site; customer?: Customer } {
  const site = getSite(sites, ticket.site_id);
  const customer = site ? getCustomer(customers, site.customer_id) : undefined;
  return { site, customer };
}

export function activeTicketForDumpster(tickets: Ticket[], dumpsterId: string): Ticket | undefined {
  return tickets.find(
    (t) => t.dumpster_id === dumpsterId && (t.status === "dropped" || t.status === "ready-to-invoice")
  );
}

export function sitesForCustomer(sites: Site[], customerId: string): Site[] {
  return sites.filter((s) => s.customer_id === customerId);
}

export function ticketsForCustomer(tickets: Ticket[], sites: Site[], customerId: string): Ticket[] {
  const siteIds = new Set(sitesForCustomer(sites, customerId).map((s) => s.id));
  return tickets.filter((t) => siteIds.has(t.site_id));
}

export interface DriverEvent {
  ticket: Ticket;
  action: "dropped" | "picked-up";
  date: string;
}

/** Every drop-off / pickup a driver has on record, newest first. */
export function driverEvents(tickets: Ticket[], driverName: string): DriverEvent[] {
  const events: DriverEvent[] = [];
  for (const t of tickets) {
    if (t.dropped_by_driver === driverName && t.drop_date) {
      events.push({ ticket: t, action: "dropped", date: t.drop_date });
    }
    if (t.picked_up_by_driver === driverName && t.pickup_date) {
      events.push({ ticket: t, action: "picked-up", date: t.pickup_date });
    }
  }
  return events.sort((a, b) => (a.date < b.date ? 1 : -1));
}
