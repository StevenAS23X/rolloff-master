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
    </div>
  );
}
