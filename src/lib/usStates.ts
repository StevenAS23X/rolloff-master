export const US_STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

export function toStateAbbreviation(stateName: string): string {
  return US_STATE_ABBREVIATIONS[stateName.trim().toLowerCase()] ?? stateName;
}

const STATE_ABBREVIATIONS = new Set(Object.values(US_STATE_ABBREVIATIONS));

/**
 * Best-effort local parse of "123 Main St, Tampa, FL 33602" style addresses into
 * city/state — used as a fallback when the geocoding suggestion API is slow,
 * rate-limited, or the user never clicks a suggestion.
 */
export function parseCityState(address: string): { city?: string; state?: string } {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return {};

  const last = parts[parts.length - 1];
  const firstToken = last.split(/\s+/)[0]?.toUpperCase();
  let state: string | undefined;
  if (firstToken && firstToken.length === 2 && STATE_ABBREVIATIONS.has(firstToken)) {
    state = firstToken;
  } else {
    const asAbbreviation = toStateAbbreviation(last.replace(/\d{5}(-\d{4})?$/, "").trim());
    if (STATE_ABBREVIATIONS.has(asAbbreviation)) state = asAbbreviation;
  }
  if (!state) return {};

  const city = parts[parts.length - 2];
  return { city, state };
}
