import { z } from "zod";
import {
  BUSINESS_SIZE_ESTIMATES,
  BUSINESS_STATUSES,
  ENRICHMENT_STATUSES,
  LEAD_STATUSES,
  OPEN_CLOSED_FILTERS,
  OPTIONAL_PLACE_FIELDS,
  SEARCH_MODES,
  SOCIAL_PLATFORMS,
} from "./types";

export const searchFiltersSchema = z.object({
  minRating: z.number().min(0).max(5).optional(),
  maxRating: z.number().min(0).max(5).optional(),
  minReviews: z.number().int().min(0).optional(),
  maxReviews: z.number().int().min(0).optional(),
  hasWebsite: z.boolean().optional(),
  hasEmail: z.boolean().optional(),
  hasSocial: z.boolean().optional(),
  hasWhatsapp: z.boolean().optional(),
  socialPlatforms: z.array(z.enum(SOCIAL_PLATFORMS)).optional(),
  businessStatus: z.array(z.enum(BUSINESS_STATUSES)).optional(),
  status: z.array(z.enum(LEAD_STATUSES)).optional(),
  enrichmentStatus: z.array(z.enum(ENRICHMENT_STATUSES)).optional(),
  favourite: z.boolean().optional(),
  archived: z.boolean().optional(),
  businessSizeEstimate: z.array(z.enum(BUSINESS_SIZE_ESTIMATES)).optional(),
  search: z.string().optional(),
});

export const createSearchSchema = z.object({
  searchMode: z.enum(SEARCH_MODES).default("keyword"),
  keyword: z.string().trim().min(1, "Keyword is required").max(200),
  location: z.string().trim().min(1, "Location is required").max(200),
  radiusKm: z.number().min(0.1).max(100),
  maxLeads: z.number().int().min(1).max(5000),
  language: z.string().trim().max(10).optional(),
  openClosed: z.enum(OPEN_CLOSED_FILTERS).default("any"),
  filters: searchFiltersSchema.optional(),
  fields: z.array(z.enum(OPTIONAL_PLACE_FIELDS)).default([...OPTIONAL_PLACE_FIELDS]),
});

export const estimateCostSchema = z.object({
  keyword: z.string().trim().min(1).max(200),
  maxLeads: z.number().int().min(1).max(5000),
  searchMode: z.enum(SEARCH_MODES).optional(),
  fields: z.array(z.enum(OPTIONAL_PLACE_FIELDS)).default([...OPTIONAL_PLACE_FIELDS]),
});

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  favourite: z.boolean().optional(),
  archived: z.boolean().optional(),
  assignedTo: z.string().trim().max(120).nullable().optional(),
  contactName: z.string().trim().max(120).nullable().optional(),
  hasWhatsapp: z.boolean().nullable().optional(),
});

export const templateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  body: z.string().trim().min(1, "Message body is required").max(4000),
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  body: z.string().trim().min(1).max(4000).optional(),
  isDefault: z.boolean().optional(),
});

export const updateSettingsSchema = z.object({
  googlePlacesApiKey: z.string().trim().min(1, "API key can't be empty").max(500),
});

export const bulkUpdateLeadsSchema = z.object({
  ids: z.array(z.string()).min(1),
  status: z.enum(LEAD_STATUSES).optional(),
  favourite: z.boolean().optional(),
  archived: z.boolean().optional(),
  assignedTo: z.string().trim().max(120).nullable().optional(),
  addTags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const bulkDeleteLeadsSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const mergeLeadsSchema = z.object({
  primaryId: z.string(),
  duplicateIds: z.array(z.string()).min(1),
});

export const importRowSchema = z.object({
  placeId: z.string().trim().optional(),
  // Intentionally not min(1): a blank name is a per-row "skip", handled by
  // importLeads()'s own counting logic — rejecting it here would fail the
  // *entire* batch instead of just that row.
  name: z.string().trim(),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  address: z.string().trim().optional(),
  category: z.string().trim().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  email: z.string().trim().optional(),
  notes: z.string().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
});

export const importCommitSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(5000),
});

export const leadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  searchId: z.string().optional(),
  minRating: z.coerce.number().optional(),
  maxRating: z.coerce.number().optional(),
  minReviews: z.coerce.number().int().optional(),
  maxReviews: z.coerce.number().int().optional(),
  hasWebsite: z.enum(["true", "false"]).optional(),
  hasEmail: z.enum(["true", "false"]).optional(),
  hasSocial: z.enum(["true", "false"]).optional(),
  hasWhatsapp: z.enum(["true", "false"]).optional(),
  socialPlatforms: z.string().optional(), // comma-separated
  businessStatus: z.string().optional(), // comma-separated
  status: z.string().optional(), // comma-separated
  enrichmentStatus: z.string().optional(), // comma-separated
  businessSizeEstimate: z.string().optional(), // comma-separated
  favourite: z.enum(["true", "false"]).optional(),
  archived: z.enum(["true", "false"]).optional(),
});

// Export fetches every matching lead in one shot (no pagination), so it
// doesn't carry the list endpoint's page/pageSize fields or their 200 cap.
export const leadsExportQuerySchema = leadsQuerySchema.omit({
  page: true,
  pageSize: true,
});
