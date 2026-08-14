import { Dumpster, DumpsterStatus } from "./types";

export function dumpsterStatusPercentages(
  dumpster: Dumpster,
  now: Date = new Date()
): Record<DumpsterStatus, number> {
  const totals: Record<DumpsterStatus, number> = { idle: 0, "in-service": 0, "out-of-service": 0 };
  const history = dumpster.status_history;
  if (history.length === 0) return totals;

  for (let i = 0; i < history.length; i++) {
    const start = new Date(history[i].since).getTime();
    const end = i + 1 < history.length ? new Date(history[i + 1].since).getTime() : now.getTime();
    totals[history[i].status] += Math.max(0, end - start);
  }

  const sum = totals.idle + totals["in-service"] + totals["out-of-service"];
  if (sum <= 0) return { idle: 0, "in-service": 0, "out-of-service": 0 };
  return {
    idle: (totals.idle / sum) * 100,
    "in-service": (totals["in-service"] / sum) * 100,
    "out-of-service": (totals["out-of-service"] / sum) * 100,
  };
}
