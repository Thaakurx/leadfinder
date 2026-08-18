import { matchKnownPlaceType } from "./google-place-types";
import type { OptionalPlaceField, SearchMode } from "./types";

// Places API (New) pricing changes over time and depends on which field
// "SKU" tier your request falls into (Essentials / Pro / Enterprise).
// Selecting any of the optional Enterprise-tier fields (phone, website,
// rating, hours, price level) bills the WHOLE request at the Enterprise
// rate — there's no partial discount for requesting only one of them.
// Selecting none keeps the request at the cheaper Essentials rate (name,
// address, location, category — always fetched, never optional).
//
// These are APPROXIMATIONS for budgeting purposes only — verify current
// pricing at https://mapsplatform.google.com/pricing/ before relying on it,
// and prefer setting the env vars below to your actual negotiated rates.
const DEFAULT_ESSENTIALS_COST_PER_REQUEST_USD = 0.005;
const DEFAULT_ENTERPRISE_COST_PER_REQUEST_USD = 0.035;
const RESULTS_PER_REQUEST = 20;
const GEOCODING_COST_PER_REQUEST_USD = 0.005;

function costPerRequest(fields: OptionalPlaceField[]): {
  amount: number;
  tier: "essentials" | "enterprise";
} {
  const isEnterprise = fields.length > 0;
  const envVar = isEnterprise
    ? "GOOGLE_PLACES_COST_PER_REQUEST_USD"
    : "GOOGLE_PLACES_ESSENTIALS_COST_PER_REQUEST_USD";
  const env = process.env[envVar];
  const parsed = env ? Number(env) : NaN;
  const amount =
    Number.isFinite(parsed) && parsed > 0
      ? parsed
      : isEnterprise
        ? DEFAULT_ENTERPRISE_COST_PER_REQUEST_USD
        : DEFAULT_ESSENTIALS_COST_PER_REQUEST_USD;
  return { amount, tier: isEnterprise ? "enterprise" : "essentials" };
}

export interface CostEstimate {
  estimatedRequests: number;
  estimatedCostUsd: number;
  cappedAt20: boolean;
  tier: "essentials" | "enterprise";
  note: string;
}

export function estimateSearchCost(
  keyword: string,
  maxLeads: number,
  searchMode?: SearchMode,
  fields: OptionalPlaceField[] = []
): CostEstimate {
  const knownType = matchKnownPlaceType(keyword);
  const isNearby = searchMode === "category" || (!searchMode && knownType != null);
  const { amount: perRequest, tier } = costPerRequest(fields);
  const tierNote =
    tier === "enterprise"
      ? `Billed at Enterprise tier ($${perRequest.toFixed(3)}/request) because phone, website, rating, hours, or price level is selected.`
      : `Billed at the cheaper Essentials tier ($${perRequest.toFixed(3)}/request) — no phone/website/rating/hours/price level selected.`;

  if (isNearby) {
    // Nearby Search (New) does not paginate — a single request returns at
    // most 20 results, regardless of maxLeads.
    const cappedAt20 = maxLeads > RESULTS_PER_REQUEST;
    return {
      estimatedRequests: 1,
      estimatedCostUsd: Number((1 * perRequest + GEOCODING_COST_PER_REQUEST_USD).toFixed(4)),
      cappedAt20,
      tier,
      note: cappedAt20
        ? `Category search uses Nearby Search, which returns at most ${RESULTS_PER_REQUEST} results per run regardless of your cap. ${tierNote}`
        : `Category search uses Nearby Search (1 request). ${tierNote}`,
    };
  }

  const requests = Math.max(1, Math.ceil(maxLeads / RESULTS_PER_REQUEST));
  return {
    estimatedRequests: requests,
    estimatedCostUsd: Number(
      (requests * perRequest + GEOCODING_COST_PER_REQUEST_USD).toFixed(4)
    ),
    cappedAt20: false,
    tier,
    note: `Text Search returns up to ${RESULTS_PER_REQUEST} results per request — fetching ${maxLeads} leads takes ~${requests} request(s). ${tierNote}`,
  };
}
