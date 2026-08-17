/** A real street address starts with a house/building number (e.g. "421 Industrial Pkwy"). */
export function hasLeadingStreetNumber(address: string): boolean {
  return /^\s*\d+\s*\S/.test(address);
}

/** Formats a shipping-style address (line1/2/3 + city/state/zip) into one readable string. */
export function formatAddress(parts: {
  line1: string;
  line2?: string;
  line3?: string;
  city: string;
  state: string;
  zip: string;
}): string {
  const lines = [parts.line1, parts.line2, parts.line3].filter((l) => l && l.trim());
  const cityStateZip = [parts.city, [parts.state, parts.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [...lines, cityStateZip].filter(Boolean).join(", ");
}
