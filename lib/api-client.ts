import type { CostEstimate } from "./cost";
import type {
  LeadDTO,
  LeadStatus,
  OpenClosedFilter,
  OptionalPlaceField,
  SearchDTO,
  SearchFilters,
  SearchMode,
  SettingsDTO,
  TemplateDTO,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export interface LeadsQueryParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  searchId?: string;
  filters?: SearchFilters;
}

export interface LeadsResponse {
  leads: LeadDTO[];
  total: number;
  page: number;
  pageSize: number;
}

function filtersToParams(params: LeadsQueryParams): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.sortDir) sp.set("sortDir", params.sortDir);
  if (params.search) sp.set("search", params.search);
  if (params.searchId) sp.set("searchId", params.searchId);

  const f = params.filters;
  if (f) {
    if (f.minRating != null) sp.set("minRating", String(f.minRating));
    if (f.maxRating != null) sp.set("maxRating", String(f.maxRating));
    if (f.minReviews != null) sp.set("minReviews", String(f.minReviews));
    if (f.maxReviews != null) sp.set("maxReviews", String(f.maxReviews));
    if (f.hasWebsite != null) sp.set("hasWebsite", String(f.hasWebsite));
    if (f.hasEmail != null) sp.set("hasEmail", String(f.hasEmail));
    if (f.hasSocial != null) sp.set("hasSocial", String(f.hasSocial));
    if (f.hasWhatsapp != null) sp.set("hasWhatsapp", String(f.hasWhatsapp));
    if (f.socialPlatforms?.length)
      sp.set("socialPlatforms", f.socialPlatforms.join(","));
    if (f.businessStatus?.length)
      sp.set("businessStatus", f.businessStatus.join(","));
    if (f.status?.length) sp.set("status", f.status.join(","));
    if (f.enrichmentStatus?.length)
      sp.set("enrichmentStatus", f.enrichmentStatus.join(","));
    if (f.businessSizeEstimate?.length)
      sp.set("businessSizeEstimate", f.businessSizeEstimate.join(","));
    if (f.favourite != null) sp.set("favourite", String(f.favourite));
    if (f.archived != null) sp.set("archived", String(f.archived));
  }
  return sp;
}

export function fetchLeads(params: LeadsQueryParams): Promise<LeadsResponse> {
  return request(`/api/leads?${filtersToParams(params).toString()}`);
}

export interface UpdateLeadInput {
  status?: LeadStatus;
  notes?: string | null;
  tags?: string[];
  favourite?: boolean;
  archived?: boolean;
  assignedTo?: string | null;
  contactName?: string | null;
  hasWhatsapp?: boolean | null;
}

export function updateLead(
  id: string,
  data: UpdateLeadInput
): Promise<{ lead: LeadDTO }> {
  return request(`/api/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteLead(id: string): Promise<{ ok: true }> {
  return request(`/api/leads/${id}`, { method: "DELETE" });
}

export interface BulkUpdateLeadsInput {
  ids: string[];
  status?: LeadStatus;
  favourite?: boolean;
  archived?: boolean;
  assignedTo?: string | null;
  addTags?: string[];
}

export function bulkUpdateLeads(
  input: BulkUpdateLeadsInput
): Promise<{ updated: number }> {
  return request(`/api/leads`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function bulkDeleteLeads(ids: string[]): Promise<{ deleted: number }> {
  return request(`/api/leads`, {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

export function enrichLead(id: string): Promise<{ ok: true }> {
  return request(`/api/leads/${id}/enrich`, { method: "POST" });
}

export function runEnrichment(body: {
  searchId?: string;
  leadIds?: string[];
  force?: boolean;
}): Promise<{ queued: number }> {
  return request(`/api/enrichment/run`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function estimateSearchCost(
  keyword: string,
  maxLeads: number,
  searchMode?: SearchMode,
  fields?: OptionalPlaceField[]
): Promise<CostEstimate> {
  return request(`/api/searches/estimate`, {
    method: "POST",
    body: JSON.stringify({ keyword, maxLeads, searchMode, fields }),
  });
}

export interface CreateSearchInput {
  searchMode: SearchMode;
  keyword: string;
  location: string;
  radiusKm: number;
  maxLeads: number;
  language?: string;
  openClosed?: OpenClosedFilter;
  filters?: SearchFilters;
  fields: OptionalPlaceField[];
}

export function createSearch(
  input: CreateSearchInput
): Promise<{ search: SearchDTO }> {
  return request(`/api/searches`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchSearches(): Promise<{ searches: SearchDTO[] }> {
  return request(`/api/searches`);
}

export function fetchSearch(id: string): Promise<{ search: SearchDTO }> {
  return request(`/api/searches/${id}`);
}

export function rerunSearch(id: string): Promise<{ search: SearchDTO }> {
  return request(`/api/searches/${id}/rerun`, { method: "POST" });
}

export function deleteSearch(id: string): Promise<{ ok: true }> {
  return request(`/api/searches/${id}`, { method: "DELETE" });
}

export function pauseSearch(id: string): Promise<{ ok: true }> {
  return request(`/api/searches/${id}/pause`, { method: "POST" });
}

export function resumeSearch(id: string): Promise<{ ok: true }> {
  return request(`/api/searches/${id}/resume`, { method: "POST" });
}

export function cancelSearch(id: string): Promise<{ ok: true }> {
  return request(`/api/searches/${id}/cancel`, { method: "POST" });
}

export interface DuplicateGroup {
  key: string;
  matchedOn: "phone" | "website";
  leads: LeadDTO[];
}

export function fetchDuplicates(): Promise<{ groups: DuplicateGroup[] }> {
  return request(`/api/leads/duplicates`);
}

export function mergeLeads(
  primaryId: string,
  duplicateIds: string[]
): Promise<{ lead: LeadDTO }> {
  return request(`/api/leads/merge`, {
    method: "POST",
    body: JSON.stringify({ primaryId, duplicateIds }),
  });
}

export interface ImportPreviewResponse {
  headers: string[];
  rows: Record<string, string>[];
  truncated: boolean;
}

export async function previewImportFile(
  file: File
): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/leads/import/preview", {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to parse file");
  return data;
}

export interface ImportRow {
  placeId?: string;
  name: string;
  phone?: string;
  website?: string;
  address?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  email?: string;
  notes?: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function commitImport(rows: ImportRow[]): Promise<ImportResult> {
  return request(`/api/leads/import`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

export function fetchTemplates(): Promise<{ templates: TemplateDTO[] }> {
  return request(`/api/templates`);
}

export function createTemplate(input: {
  name: string;
  body: string;
}): Promise<{ template: TemplateDTO }> {
  return request(`/api/templates`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTemplate(
  id: string,
  input: { name?: string; body?: string; isDefault?: boolean }
): Promise<{ template: TemplateDTO }> {
  return request(`/api/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteTemplate(id: string): Promise<{ ok: true }> {
  return request(`/api/templates/${id}`, { method: "DELETE" });
}

export function fetchSettings(): Promise<SettingsDTO> {
  return request(`/api/settings`);
}

export function updateSettings(input: {
  googlePlacesApiKey: string;
}): Promise<{ ok: true }> {
  return request(`/api/settings`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
