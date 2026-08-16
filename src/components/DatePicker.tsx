"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  dateToISODate as toISODate,
  formatDisplayDate as formatDisplay,
  monthGridCells,
  parseISODateLocal as parseISODate,
  startOfDay,
} from "@/lib/calendarUtil";

export function DatePicker({
  value,
  onChange,
  required,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  const today = startOfDay(new Date());
  const selected = value ? parseISODate(value) : null;

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => selected ?? today);
  const [pendingPastDate, setPendingPastDate] = useState<Date | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openCalendar() {
    setViewMonth(selected ?? today);
    setOpen(true);
  }

  function commit(day: Date) {
    onChange(toISODate(day));
    setOpen(false);
  }

  function handleDayClick(day: Date) {
    if (day.getTime() < today.getTime()) {
      setPendingPastDate(day);
    } else {
      commit(day);
    }
  }

  const cells = monthGridCells(viewMonth);

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        role="button"
        tabIndex={0}
        data-testid="date-picker-trigger"
        onClick={openCalendar}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openCalendar();
          }
        }}
        className={`${className ?? ""} flex cursor-pointer items-center justify-between text-left`}
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
          {selected ? formatDisplay(selected) : "Select a date..."}
        </span>
        <span aria-hidden className="text-slate-400">📅</span>
      </div>
      {/* Kept in the layout (not display:none) so native form validation still fires on submit. */}
      <input
        tabIndex={-1}
        aria-hidden
        required={required}
        value={value}
        readOnly
        className="sr-only"
      />

      {open && (
        <div data-testid="date-picker-popover" className="absolute z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              className="rounded px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-slate-900">
              {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              className="rounded px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
            {WEEKDAY_LABELS.map((w, i) => (
              <span key={i} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <span key={i} />;
              const isPast = day.getTime() < today.getTime();
              const isToday = day.getTime() === today.getTime();
              const isSelected = selected && day.getTime() === selected.getTime();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`touch-manipulation rounded-md py-1.5 text-sm ${
                    isSelected
                      ? "bg-slate-900 font-semibold text-white"
                      : isPast
                      ? "text-slate-300 hover:bg-slate-50"
                      : isToday
                      ? "font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {pendingPastDate &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
              <h3 className="text-base font-semibold text-slate-900">Confirm past date</h3>
              <p className="mt-2 text-sm text-slate-600">
                {formatDisplay(pendingPastDate)} is in the past. Use it anyway?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingPastDate(null)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    commit(pendingPastDate);
                    setPendingPastDate(null);
                  }}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Use This Date
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
