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
