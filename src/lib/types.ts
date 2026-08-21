export type TicketType = "residential" | "commercial" | "live-load";

export type TicketStatus =
  | "draft"
  | "order-taken"
  | "dropped"
  | "ready-to-invoice"
  | "invoiced"
  | "archived";

export type DumpsterStatus = "idle" | "in-service" | "out-of-service";

export type Role = "admin" | "dispatch" | "driver";

/** Extra capabilities a non-admin account can be granted beyond their role's defaults. */
export interface AccountPermissions {
  manageDumpsters: boolean;
  viewArchived: boolean;
  editTickets: boolean;
}

export interface Account {
  id: string;
  name: string;
  role: Role;
  permissions?: Partial<AccountPermissions>;
}

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
}

export interface FeatureFlags {
  showCalendarTab: boolean;
  showDaysOnSiteFilter: boolean;
  requireDriverFromRoster: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

export interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  address: string; // street address line 1
  address_line2: string;
  address_line3: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
}

export interface Site {
  id: string;
  customer_id: string;
  site_address: string; // street address line 1
  site_address_line2: string;
  site_address_line3: string;
  site_city: string;
  site_state: string;
  site_zip: string;
  site_contact_name: string;
  site_contact_phone: string;
}

export interface AdditionalFee {
  id: string;
  description: string;
  amount: number; // dollars; negative = a deduction
  addedBy: string;
  createdAt: string; // ISO timestamp
}

/** One truckload of a live-load job — only the size is required, the rest can be filled in later. */
export interface LiveLoad {
  id: string;
  dumpster_id: string; // free-text box number, optional
  size_yards: string;
  material: string;
}

export interface Ticket {
  id: string;
  site_id: string;
  date_of_order: string;
  type: TicketType;
  box_size: string;
  material: string;
  notes: string;
  requested_drop_date: string;
  dumpster_id: string | null;
  status: TicketStatus;
  drop_date: string | null;
  drop_description: string;
  dropped_by_driver: string;
  drop_condition_notes: string;
  pickup_date: string | null;
  picked_up_by_driver: string;
  pickup_condition_notes: string;
  invoiced: boolean;
  invoice_number: string;
  invoiceable_amount: string;
  additionalFees: AdditionalFee[];
  /** Live-load only: rough estimate of loads, captured at order-taken time. */
  live_load_count: string;
  /** Live-load only: the actual loads, captured when the job is completed. */
  loads: LiveLoad[];
  /** Live-load only: everyone who drove a load, roster or contracted. */
  live_load_drivers: string[];
}

export interface DumpsterStatusEntry {
  status: DumpsterStatus;
  since: string; // ISO timestamp
}

export interface ServiceNote {
  id: string;
  note: string;
  createdAt: string; // ISO timestamp
  createdBy: string;
}

export interface Dumpster {
  id: string;
  size_yards: string;
  status: DumpsterStatus;
  status_history: DumpsterStatusEntry[];
  service_notes: ServiceNote[];
}

export interface ChangeLogEntry {
  id: string;
  entityType: "ticket" | "customer";
  entityId: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string; // ISO timestamp
}

export interface NotificationEntry {
  id: string;
  message: string;
  createdAt: string; // ISO timestamp
  read: boolean;
  dumpsterId?: string;
}
