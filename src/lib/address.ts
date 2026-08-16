/** A real street address starts with a house/building number (e.g. "421 Industrial Pkwy"). */
export function hasLeadingStreetNumber(address: string): boolean {
  return /^\s*\d+\s*\S/.test(address);
}
