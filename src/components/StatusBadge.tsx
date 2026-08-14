import { TicketStatus, DumpsterStatus } from "@/lib/types";

export const TICKET_LABELS: Record<TicketStatus, string> = {
  draft: "Draft",
  "order-taken": "Order Taken",
  dropped: "Box Dropped",
  "ready-to-invoice": "Ready to Invoice",
  invoiced: "Invoiced",
  archived: "Archived",
};

const TICKET_STYLES: Record<TicketStatus, string> = {
  draft: "bg-purple-100 text-purple-700 ring-purple-300",
  "order-taken": "bg-slate-100 text-slate-700 ring-slate-300",
  dropped: "bg-amber-100 text-amber-800 ring-amber-300",
  "ready-to-invoice": "bg-blue-100 text-blue-800 ring-blue-300",
  invoiced: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  archived: "bg-zinc-100 text-zinc-600 ring-zinc-300",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${TICKET_STYLES[status]}`}
    >
      {TICKET_LABELS[status]}
    </span>
  );
}

const DUMPSTER_LABELS: Record<DumpsterStatus, string> = {
  idle: "Idle",
  "in-service": "In Service",
  "out-of-service": "Out of Service",
};

const DUMPSTER_STYLES: Record<DumpsterStatus, string> = {
  idle: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  "in-service": "bg-orange-100 text-orange-800 ring-orange-300",
  "out-of-service": "bg-red-100 text-red-800 ring-red-300",
};

export function DumpsterStatusBadge({ status }: { status: DumpsterStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${DUMPSTER_STYLES[status]}`}
    >
      {DUMPSTER_LABELS[status]}
    </span>
  );
}
