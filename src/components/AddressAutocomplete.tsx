"use client";

import { useEffect, useRef, useState } from "react";
import { toStateAbbreviation } from "@/lib/usStates";

interface Suggestion {
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    state?: string;
    postcode?: string;
  };
}

export interface AddressSelection {
  line1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onBlurValue,
  placeholder,
  required,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (selection: AddressSelection) => void;
  /** Fires on blur with the current text — lets the caller fall back to a local parse if no suggestion was ever picked. */
  onBlurValue?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function handleChange(next: string) {
    onChange(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (next.trim().length < 4) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(
            next
          )}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setOpen(true);
      } catch {
        // Network/geocoding failures are non-fatal — the typed address is still usable as-is.
      }
    }, 350);
  }

  return (
    <div className="relative">
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => {
          onBlurValue?.(value);
          setTimeout(() => setOpen(false), 250);
        }}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  const line1 =
                    [s.address?.house_number, s.address?.road].filter(Boolean).join(" ") ||
                    s.display_name.split(",")[0].trim();
                  onChange(line1);
                  const city = s.address?.city ?? s.address?.town ?? s.address?.village ?? s.address?.hamlet;
                  const state = s.address?.state ? toStateAbbreviation(s.address.state) : undefined;
                  const zip = s.address?.postcode;
                  if (city || state || zip) onSelect?.({ line1, city, state, zip });
                  setSuggestions([]);
                  setOpen(false);
                }}
                className="block w-full touch-manipulation px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100"
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
