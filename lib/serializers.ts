import type { Lead, MessageTemplate, Search } from "@prisma/client";
import type {
  LeadDTO,
  OptionalPlaceField,
  SearchDTO,
  SearchFilters,
  SocialLinks,
  TemplateDTO,
} from "./types";

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function serializeLead(lead: Lead): LeadDTO {
  return {
    id: lead.id,
    placeId: lead.placeId,
    name: lead.name,
    category: safeJsonParse<string[]>(lead.category, []),
    primaryType: lead.primaryType,
    address: lead.address,
    phone: lead.phone,
    website: lead.website,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    businessStatus: lead.businessStatus as LeadDTO["businessStatus"],
    priceLevel: lead.priceLevel,
    lat: lead.lat,
    lng: lead.lng,
    openingHours: safeJsonParse<string[] | null>(lead.openingHours, null),
    emails: safeJsonParse<string[]>(lead.emails, []),
    emailVerified: lead.emailVerified as LeadDTO["emailVerified"],
    socialLinks: safeJsonParse<SocialLinks>(lead.socialLinks, {}),
    bookingLink: lead.bookingLink,
    menuLink: lead.menuLink,
    companyDescription: lead.companyDescription,
    techStack: safeJsonParse<string[]>(lead.techStack, []),
    sslValid: lead.sslValid,
    sslIssuer: lead.sslIssuer,
    sslExpiresAt: lead.sslExpiresAt ? lead.sslExpiresAt.toISOString() : null,
    businessSizeEstimate: lead.businessSizeEstimate as LeadDTO["businessSizeEstimate"],
    enrichmentStatus: lead.enrichmentStatus as LeadDTO["enrichmentStatus"],
    enrichmentError: lead.enrichmentError,
    enrichedAt: lead.enrichedAt ? lead.enrichedAt.toISOString() : null,
    status: lead.status as LeadDTO["status"],
    notes: lead.notes,
    tags: safeJsonParse<string[]>(lead.tags, []),
    favourite: lead.favourite,
    archived: lead.archived,
    assignedTo: lead.assignedTo,
    contactName: lead.contactName,
    hasWhatsapp: lead.hasWhatsapp,
    searchId: lead.searchId,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export function serializeSearch(search: Search): SearchDTO {
  return {
    id: search.id,
    keyword: search.keyword,
    location: search.location,
    lat: search.lat,
    lng: search.lng,
    radius: search.radius,
    maxLeads: search.maxLeads,
    searchMode: search.searchMode as SearchDTO["searchMode"],
    language: search.language,
    openClosed: search.openClosed as SearchDTO["openClosed"],
    filters: safeJsonParse<SearchFilters>(search.filters, {}),
    fields: safeJsonParse<OptionalPlaceField[]>(search.fields, []),
    leadCount: search.leadCount,
    costEstimate: search.costEstimate,
    actualCost: search.actualCost,
    jobStatus: search.jobStatus as SearchDTO["jobStatus"],
    jobError: search.jobError,
    jobProgress: search.jobProgress,
    durationMs: search.durationMs,
    successCount: search.successCount,
    failedCount: search.failedCount,
    duplicateCount: search.duplicateCount,
    createdAt: search.createdAt.toISOString(),
    updatedAt: search.updatedAt.toISOString(),
  };
}

export function serializeTemplate(template: MessageTemplate): TemplateDTO {
  return {
    id: template.id,
    name: template.name,
    body: template.body,
    isDefault: template.isDefault,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}
