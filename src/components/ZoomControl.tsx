"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "rolloff-zoom";
const MIN = 90;
const MAX = 150;
const STEP = 10;

function applyZoom(pct: number) {
  document.documentElement.style.fontSize = pct === 100 ? "" : `${(pct / 100) * 16}px`;
}

export function ZoomControl() {
  // Starts null so nothing renders until mount — the real value depends on localStorage,
  // which the server can't know (same hydration-mismatch reasoning as ThemeToggle).
  const [zoom, setZoom] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reads the value the blocking init script in layout.tsx already applied before paint;
    // this just mirrors that into React state once on mount.
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? "", 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZoom(Number.isFinite(stored) && stored >= MIN && stored <= MAX ? stored : 100);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function updateZoom(next: number) {
    setZoom(next);
    applyZoom(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Adjust text size"
        title="Adjust text size"
        className="flex h-8 items-center justify-center rounded-md px-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Aa
      </button>
      {open && zoom !== null && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Text size</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{zoom}%</span>
          </div>
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={zoom}
            onChange={(e) => updateZoom(Number(e.target.value))}
            className="w-full"
          />
          <button
            type="button"
            onClick={() => updateZoom(100)}
            className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
