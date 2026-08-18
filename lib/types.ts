export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "qualified",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const ENRICHMENT_STATUSES = [
  "pending",
  "running",
  "found",
  "not_found",
  "failed",
] as const;
export type EnrichmentStatus = (typeof ENRICHMENT_STATUSES)[number];

export const JOB_STATUSES = [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const BUSINESS_STATUSES = [
  "OPERATIONAL",
  "CLOSED_TEMPORARILY",
  "CLOSED_PERMANENTLY",
] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "youtube",
  "tiktok",
  "whatsapp",
  "pinterest",
  "telegram",
  "threads",
  "snapchat",
  "discord",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

export const BUSINESS_SIZE_ESTIMATES = [
  "small",
  "medium",
  "large",
  "enterprise",
] as const;
export type BusinessSizeEstimate = (typeof BUSINESS_SIZE_ESTIMATES)[number];

export const EMAIL_VERIFICATION_STATUSES = ["valid", "invalid", "unknown"] as const;
export type EmailVerificationStatus = (typeof EMAIL_VERIFICATION_STATUSES)[number];

export const OPEN_CLOSED_FILTERS = ["any", "open", "closed"] as const;
export type OpenClosedFilter = (typeof OPEN_CLOSED_FILTERS)[number];

export const SEARCH_MODES = ["category", "keyword"] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

// Places API (New) bills per request based on which field "SKU" tier the
// requested fields fall into. Name, address, location, category, and
// business status are Essentials-tier (cheap) and always fetched — the app
// needs them regardless (category matching, open/closed filter, table
// display). These five are Enterprise-tier: selecting ANY of them bills the
// whole request at the higher Enterprise rate; selecting none keeps it at
// the cheaper Essentials rate (see lib/cost.ts and lib/google-places.ts).
export const OPTIONAL_PLACE_FIELDS = [
  "phone",
  "website",
  "rating",
  "hours",
  "priceLevel",
] as const;
export type OptionalPlaceField = (typeof OPTIONAL_PLACE_FIELDS)[number];

export interface OpeningHours {
  weekdayDescriptions: string[];
}

export interface SearchFilters {
  minRating?: number;
  maxRating?: number;
  minReviews?: number;
  maxReviews?: number;
  hasWebsite?: boolean;
  hasEmail?: boolean;
  hasSocial?: boolean;
  hasWhatsapp?: boolean;
  socialPlatforms?: SocialPlatform[];
  businessStatus?: BusinessStatus[];
  status?: LeadStatus[];
  enrichmentStatus?: EnrichmentStatus[];
  favourite?: boolean;
  archived?: boolean;
  businessSizeEstimate?: BusinessSizeEstimate[];
  search?: string;
}

// Serialized (JSON-safe) shape of a Lead as sent to/from the API.
export interface LeadDTO {
  id: string;
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
  emails: string[];
  emailVerified: EmailVerificationStatus | null;
  socialLinks: SocialLinks;
  bookingLink: string | null;
  menuLink: string | null;
  companyDescription: string | null;
  techStack: string[];
  sslValid: boolean | null;
  sslIssuer: string | null;
  sslExpiresAt: string | null;
  businessSizeEstimate: BusinessSizeEstimate | null;
  enrichmentStatus: EnrichmentStatus;
  enrichmentError: string | null;
  enrichedAt: string | null;
  status: LeadStatus;
  notes: string | null;
  tags: string[];
  favourite: boolean;
  archived: boolean;
  assignedTo: string | null;
  contactName: string | null;
  hasWhatsapp: boolean | null;
  searchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchDTO {
  id: string;
  keyword: string;
  location: string;
  lat: number | null;
  lng: number | null;
  radius: number;
  maxLeads: number;
  searchMode: SearchMode;
  language: string | null;
  openClosed: OpenClosedFilter;
  filters: SearchFilters;
  leadCount: number;
  costEstimate: number;
  actualCost: number;
  jobStatus: JobStatus;
  jobError: string | null;
  jobProgress: number;
  durationMs: number | null;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  fields: OptionalPlaceField[];
  createdAt: string;
  updatedAt: string;
}

export interface SettingsDTO {
  googlePlacesApiKey: {
    hasKey: boolean;
    source: "database" | "env" | "none";
  };
}

export interface TemplateDTO {
  id: string;
  name: string;
  body: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tokens a template body can contain; renderTemplate() (lib/message-template.ts)
// substitutes each with the matching field from the lead being messaged.
export const TEMPLATE_PLACEHOLDERS = [
  { token: "[Name]", label: "Contact name (falls back to business name)" },
  { token: "[Business Name]", label: "Business name" },
  { token: "[Address]", label: "Address" },
  { token: "[Phone]", label: "Phone number" },
  { token: "[Website]", label: "Website" },
  { token: "[Category]", label: "Category" },
] as const;
