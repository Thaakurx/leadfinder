import { matchKnownPlaceType } from "./google-place-types";
import type {
  BusinessStatus,
  OpenClosedFilter,
  OptionalPlaceField,
  SearchMode,
} from "./types";

const PLACES_BASE_URL = "https://places.googleapis.com/v1/places";
const GEOCODE_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

// Places API (New) rejects any locationBias/locationRestriction circle with
// a larger radius (400 INVALID_ARGUMENT) — applies to both Text Search's
// locationBias and Nearby Search's locationRestriction, confirmed against
// the live API for both endpoints.
const MAX_RADIUS_METERS = 50000;

// Always fetched — Essentials tier (cheap), and required for the app's own
// category matching, open/closed filter, and table display to work at all.
const BASE_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.businessStatus",
  "places.types",
  "places.primaryType",
];

// Enterprise tier — requesting ANY of these bills the whole request at the
// higher Enterprise rate (see lib/cost.ts). Selected per search by the user.
const OPTIONAL_FIELD_MASK: Record<OptionalPlaceField, string[]> = {
  phone: ["places.nationalPhoneNumber", "places.internationalPhoneNumber"],
  website: ["places.websiteUri"],
  rating: ["places.rating", "places.userRatingCount"],
  hours: ["places.currentOpeningHours.weekdayDescriptions"],
  priceLevel: ["places.priceLevel"],
};

// Comma-separated, no spaces, per Places API (New) field mask requirements.
// `nextPageToken` only exists on Text Search responses — Nearby Search
// doesn't paginate and rejects the whole request (400 INVALID_ARGUMENT) if
// it's included in the mask, so it's endpoint-specific, not part of the
// shared base mask.
function buildFieldMask(
  endpoint: "searchText" | "searchNearby",
  fields: OptionalPlaceField[]
): string {
  const optional = fields.flatMap((f) => OPTIONAL_FIELD_MASK[f]);
  const pageToken = endpoint === "searchText" ? ["nextPageToken"] : [];
  return [...BASE_FIELD_MASK, ...optional, ...pageToken].join(",");
}

export class GooglePlacesApiError extends Error {
  constructor(
    message: string,
    public readonly status: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "GooglePlacesApiError";
  }
}

export class GeocodingError extends Error {
  constructor(message: string, public readonly status: string) {
    super(message);
    this.name = "GeocodingError";
  }
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export async function geocodeLocation(
  location: string,
  apiKey: string,
  language?: string
): Promise<GeocodeResult> {
  const url = new URL(GEOCODE_BASE_URL);
  url.searchParams.set("address", location);
  url.searchParams.set("key", apiKey);
  if (language) url.searchParams.set("language", language);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status === "OK" && data.results?.length > 0) {
    const result = data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  }

  const friendly: Record<string, string> = {
    ZERO_RESULTS: `No location found matching "${location}". Try a more specific address or city name.`,
    OVER_QUERY_LIMIT: "Google Geocoding API quota exceeded. Check your billing/quota in Google Cloud Console.",
    REQUEST_DENIED: "Geocoding request denied — check that the Geocoding API is enabled and your API key is valid.",
    INVALID_REQUEST: "Invalid geocoding request — location text was empty or malformed.",
  };

  throw new GeocodingError(
    friendly[data.status] ?? `Geocoding failed: ${data.status}`,
    data.status ?? "UNKNOWN_ERROR"
  );
}

export interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  types?: string[];
  primaryType?: string;
  currentOpeningHours?: { weekdayDescriptions?: string[] };
  priceLevel?: string;
}

export interface NormalizedPlace {
  placeId: string;
  name: string;
  category: string[];
  primaryType: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  businessStatus: BusinessStatus | null;
  priceLevel: string | null;
  lat: number | null;
  lng: number | null;
  openingHours: string[] | null;
}

export function normalizePlace(raw: RawPlace): NormalizedPlace {
  return {
    placeId: raw.id,
    name: raw.displayName?.text ?? "(Unnamed business)",
    category: raw.types ?? [],
    primaryType: raw.primaryType ?? null,
    address: raw.formattedAddress ?? null,
    phone: raw.internationalPhoneNumber ?? raw.nationalPhoneNumber ?? null,
    website: raw.websiteUri ?? null,
    rating: raw.rating ?? null,
    reviewCount: raw.userRatingCount ?? null,
    businessStatus: (raw.businessStatus as BusinessStatus) ?? null,
    priceLevel: raw.priceLevel ?? null,
    lat: raw.location?.latitude ?? null,
    lng: raw.location?.longitude ?? null,
    openingHours: raw.currentOpeningHours?.weekdayDescriptions ?? null,
  };
}

async function callPlacesApi(
  endpoint: "searchText" | "searchNearby",
  body: Record<string, unknown>,
  apiKey: string,
  fields: OptionalPlaceField[]
): Promise<{ places: RawPlace[]; nextPageToken?: string }> {
  const res = await fetch(`${PLACES_BASE_URL}:${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": buildFieldMask(endpoint, fields),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const status = data?.error?.status ?? "UNKNOWN_ERROR";
    const friendly: Record<string, string> = {
      RESOURCE_EXHAUSTED: "Google Places API quota exceeded. Check your billing/quota in Google Cloud Console.",
      PERMISSION_DENIED: "Places API request denied — check that 'Places API (New)' is enabled and your API key is valid/unrestricted for it.",
      INVALID_ARGUMENT: `Invalid Places API request: ${data?.error?.message ?? "malformed parameters"}.`,
      UNAUTHENTICATED: "Missing or invalid Google API key.",
    };
    throw new GooglePlacesApiError(
      friendly[status] ?? data?.error?.message ?? "Places API request failed",
      status,
      res.status
    );
  }

  return { places: data.places ?? [], nextPageToken: data.nextPageToken };
}

export interface DiscoverPlacesParams {
  apiKey: string;
  keyword: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  maxResults: number;
  searchMode?: SearchMode;
  language?: string;
  openClosed?: OpenClosedFilter;
  fields?: OptionalPlaceField[];
  // Return `false` to stop pagination early (used for pause/cancel signaling).
  onPage?: (
    places: NormalizedPlace[],
    totalSoFar: number
  ) => Promise<void | boolean> | void | boolean;
}

function passesOpenClosedFilter(
  place: NormalizedPlace,
  openClosed?: OpenClosedFilter
): boolean {
  if (!openClosed || openClosed === "any") return true;
  if (openClosed === "open") return place.businessStatus === "OPERATIONAL";
  return place.businessStatus !== "OPERATIONAL";
}

/**
 * Discovers places for a keyword + location.
 *
 * - `searchMode: "category"` uses Nearby Search (New) with the keyword
 *   mapped to a known Google Places type — precise category browsing, but
 *   capped at 20 results since the New API's Nearby Search does not
 *   paginate. Throws if the keyword doesn't match a known category.
 * - `searchMode: "keyword"` (or omitted) uses Text Search (New), which
 *   handles free-text queries and paginates up to
 *   `maxResults`. If the keyword happens to match a known category and no
 *   mode was specified, Nearby Search is used automatically (cheaper/more
 *   precise for that case).
 *
 * `openClosed` filters out results by business status client-side *after*
 * fetching — it narrows what gets saved, not what Google charges you for,
 * since the Places API has no server-side open/closed filter.
 */
export async function discoverPlaces(
  params: DiscoverPlacesParams
): Promise<NormalizedPlace[]> {
  const {
    apiKey,
    keyword,
    lat,
    lng,
    radiusMeters,
    maxResults,
    searchMode,
    language,
    openClosed,
    fields = [],
    onPage,
  } = params;

  const knownType = matchKnownPlaceType(keyword);
  const useNearby = searchMode === "category" || (!searchMode && knownType);
  const collected: NormalizedPlace[] = [];

  if (useNearby) {
    if (!knownType) {
      throw new GooglePlacesApiError(
        `"${keyword}" doesn't match a known Google Places category. Try Keyword search instead.`,
        "INVALID_ARGUMENT",
        400
      );
    }
    const { places } = await callPlacesApi(
      "searchNearby",
      {
        includedTypes: [knownType],
        maxResultCount: Math.min(maxResults, 20),
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            // Silently clamp rather than fail, same as the maxResultCount
            // cap above.
            radius: Math.min(radiusMeters, MAX_RADIUS_METERS),
          },
        },
        ...(language ? { languageCode: language } : {}),
      },
      apiKey,
      fields
    );
    const normalized = places.map(normalizePlace).filter((p) => passesOpenClosedFilter(p, openClosed));
    collected.push(...normalized);
    if (onPage) await onPage(normalized, collected.length);
    return collected;
  }

  let pageToken: string | undefined;
  do {
    const body: Record<string, unknown> = {
      textQuery: keyword,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(radiusMeters, MAX_RADIUS_METERS),
        },
      },
      maxResultCount: Math.min(20, maxResults - collected.length),
      ...(language ? { languageCode: language } : {}),
    };
    if (pageToken) body.pageToken = pageToken;

    const { places, nextPageToken } = await callPlacesApi(
      "searchText",
      body,
      apiKey,
      fields
    );
    const normalized = places.map(normalizePlace).filter((p) => passesOpenClosedFilter(p, openClosed));
    collected.push(...normalized);
    if (onPage) {
      const shouldContinue = await onPage(normalized, collected.length);
      if (shouldContinue === false) break;
    }

    pageToken = nextPageToken;
    if (pageToken && collected.length < maxResults) {
      // Google recommends a short delay before a fresh pageToken becomes valid.
      await new Promise((r) => setTimeout(r, 2000));
    }
  } while (pageToken && collected.length < maxResults);

  return collected.slice(0, maxResults);
}
