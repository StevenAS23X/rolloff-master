"use client";

import { ReactNode } from "react";
import { useStore } from "@/lib/store";

export function Hydrated({ children }: { children: ReactNode }) {
  const hasHydrated = useStore((s) => s.hasHydrated);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
