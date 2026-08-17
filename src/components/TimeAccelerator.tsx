"use client";

// Temporary dev tool for verifying timer/overdue behavior without waiting real days.
// Remove this component (and the timeOffsetMs bits in the store) once QA is done.

import { useStore, useOffsetNow } from "@/lib/store";

const DAY_MS = 24 * 60 * 60 * 1000;

const JUMPS = [
  { label: "+1 Day", ms: DAY_MS },
  { label: "+3 Days", ms: 3 * DAY_MS },
  { label: "+7 Days", ms: 7 * DAY_MS },
  { label: "+14 Days", ms: 14 * DAY_MS },
  { label: "+30 Days", ms: 30 * DAY_MS },
];

// Keep this in sync as things change on the way to a demo — add an item when a known gap
// or workaround gets introduced, remove it once it's actually fixed.
const KNOWN_ISSUES = [
  "No backend yet — all data lives only in this browser's local storage. A phone and a desktop (or two different browsers) do not share data; nothing entered on one shows up on the other until a real database is added.",
  "Calendar export (.ics) is a one-time file download, not a live-updating subscription — importing it again won't pick up later changes.",
  "Admin is hidden on phones as a screen-size nudge only, not real security — it's reachable from a wide enough window. The actual protection is the admin-role login.",
  "Address suggestions depend on a free public map lookup that can be slow or briefly unavailable — typing the address manually always still works.",
  "\"Invoiced\" is a manual status + dollar amount only; no invoice is actually generated or sent (no Stripe/QuickBooks integration).",
  "No individual driver logins — dispatch enters drop-off/pickup info on the driver's behalf.",
  "Account switching (top-right dropdown) isn't real authentication — there are no passwords, so anyone with the browser open can act as any role.",
];

export function TimeAccelerator() {
  const timeOffsetMs = useStore((s) => s.timeOffsetMs);
  const setTimeOffsetMs = useStore((s) => s.setTimeOffsetMs);
  const now = useOffsetNow();

  return (
    <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-4">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">
        Temporary — Testing Only (will be removed)
      </p>
      <p className="mb-3 text-sm text-amber-800">
        Fast-forward the simulated clock to check timers and overdue highlighting without
        waiting for real days to pass.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {JUMPS.map((j) => (
          <button
            key={j.label}
            onClick={() => setTimeOffsetMs(timeOffsetMs + j.ms)}
            className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            {j.label}
          </button>
        ))}
        <button
          onClick={() => setTimeOffsetMs(0)}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Reset to Now
        </button>
        <span className="ml-auto text-sm text-amber-800">
          Simulated date: <strong>{now.toLocaleString()}</strong>
        </span>
      </div>

      <div className="mt-4 border-t border-amber-200 pt-3">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">
          Known Issues &amp; Limitations
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
          {KNOWN_ISSUES.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
