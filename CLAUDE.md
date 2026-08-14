# Dumpster Roll-Off Tracking App — Project Spec

## Overview
A web app for a dumpster roll-off business. Must run well on PC, iPhone, and iPad
(responsive web app, not separate native apps). Used by two roles: **Admin** and
**Dispatch**. Scale: roughly 50–200 dumpsters.

## Recommended stack
- **Frontend:** Next.js
- **Backend/DB/Auth:** Supabase (Postgres, built-in auth with roles, storage)
- **Hosting:** Vercel (frontend) + Supabase (backend)
- **Email alerts:** Resend or SendGrid
- **SMS alerts:** Twilio
- **Scheduled jobs (timer checks):** Supabase Edge Function or Vercel Cron, running daily

## Roles
- **Admin** — full access; can edit the database directly (Excel-like table view);
  can add/remove dumpsters; manages users.
- **Dispatch** — creates and updates tickets through the full lifecycle; sees the
  dashboard and timers. No separate driver logins for now (dispatch enters
  drop/pickup info on the drivers' behalf).

## Ticket lifecycle
```
Order Taken -> Box Dropped -> Box Picked Up -> Ready to Invoice -> Invoiced -> Archived
```
- Tickets are archived after invoicing (kept, not deleted) in case a customer disputes
  the invoice later.
- The 14/30-day timer starts at **Box Dropped** and stops at **Box Picked Up**.
- Timer length: **14 days** if Residential, **30 days** if Commercial (set by a
  checkbox at ticket creation).

## Data model

### customers
Company/billing-level info. This is what autofills when dispatch starts typing a
repeat customer's name.
- id
- company_name
- contact_name
- address, city, state
- phone
- email

### sites
A customer can have multiple active sites at once. Site info is entered fresh per
site, not autofilled, since one customer may be running multiple jobs at different
locations simultaneously.
- id
- customer_id (→ customers)
- site_address
- site_contact_name
- site_contact_phone

### tickets
A site can have multiple tickets (e.g., one site with 3 tickets, another with 1).
- id
- site_id (→ sites)
- date_of_order
- type: residential | commercial (checkbox — drives the 14/30-day timer)
- box_size
- material
- notes (gate access, gate code, "leave on street", etc.)
- requested_drop_date (calendar date-picker input)
- dumpster_id (→ dumpsters)
- status: order-taken | dropped | picked-up | ready-to-invoice | invoiced | archived
- drop_date
- drop_description (where on-site it was placed)
- dropped_by_driver
- pickup_date
- picked_up_by_driver
- invoiced (checkbox)
- invoice_number
- invoiceable_amount

### dumpsters
- id (4-digit number, e.g. 1234 — this is the box's identifying number)
- size_yards
- status: idle | in-service
  - **in-service**: assigned to an active ticket (from the moment it's assigned
    through drop-off, pickup, and while awaiting invoicing)
  - **idle**: available for assignment — a dumpster only returns to idle once its
    ticket has been **invoiced** (not simply picked up), since it's not
    considered fully closed out until then

## Ticket form fields by stage

**Order Taken**
- Date of Order
- Company Name, Name, Address, City, State, Phone, Email (customer — autofills on
  repeat customer name match)
- Site Address, Site Contact Name, Site Contact Phone Number (always entered fresh)
- Requested Drop Date (calendar popup picker)
- Box Size
- Material
- Notes
- Residential / Commercial checkbox

**Box Dropped**
- Box number (dumpster ID)
- Description of where it was dropped
- Driver who dropped it
- → Timer starts here; should be visible/tracked on the dashboard

**Box Picked Up**
- Pickup date
- Driver who picked it up
- → Timer stops; ticket moves to "ready to invoice"

**Invoiced**
- Invoiced checkbox
- Invoice number
- Invoiceable amount
- → Dumpster status flips to idle; ticket moves to archived

## Customer autofill behavior
When dispatch starts typing a customer name on a new ticket:
- If it matches an existing customer, autofill company/contact info.
- Site Address, Site Contact Name, and Site Contact Phone are **never** autofilled —
  entered fresh each time, since a customer may have multiple active sites.
- If no match is found (new customer), there is **no separate "add new customer"
  step** — dispatch just types all fields fresh on the ticket form, and the
  customer/site records are created automatically behind the scenes. (This may be
  revisited later in favor of an explicit customer-management flow.)

## Alerts
- Dispatch/Admin should get alerts as a timer approaches expiration via:
  - Email
  - SMS (text)
  - Dashboard indicator (visual, always present regardless of email/SMS)

## Open questions / not yet decided
- Dashboard layout — what should dispatch see at a glance (e.g. tickets sorted by
  days remaining, overdue highlighted, etc.)?
- Search/filter needs for the archive.
- Whether "in-service" ever applies outside the ticket flow (e.g. pulling a
  dumpster for repair/maintenance independent of a job).
- Invoicing: is "invoiced" purely a status flag, or does it need to generate/send
  an actual invoice (e.g. Stripe/QuickBooks integration)?
