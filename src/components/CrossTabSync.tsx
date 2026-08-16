"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

const STORAGE_KEY = "rolloff-data";

/**
 * Zustand's persist middleware writes to localStorage but doesn't pick up writes made by
 * other tabs/windows on its own — this listens for the storage event (fired in every tab
 * except the one that wrote it) and re-reads, so two tabs open on the same device/browser
 * stay in sync. This does NOT sync across different devices or browsers — that needs a real
 * backend, since everything here still lives in one browser's localStorage.
 */
export function CrossTabSync() {
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        useStore.persist.rehydrate();
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}
