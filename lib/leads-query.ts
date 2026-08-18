import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { leadsQuerySchema } from "./validation";

type LeadsQuery = Omit<z.infer<typeof leadsQuerySchema>, "page" | "pageSize">;

const SORTABLE_FIELDS = new Set([
  "name",
  "rating",
  "reviewCount",
  "createdAt",
  "updatedAt",
  "status",
  "enrichmentStatus",
  "businessStatus",
]);

function splitCsv(value?: string): string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function buildLeadsWhere(query: LeadsQuery): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];

  if (query.searchId) and.push({ searchId: query.searchId });

  if (query.search) {
    const term = query.search.trim();
    if (term) {
      and.push({
        OR: [
          { name: { contains: term } },
          { address: { contains: term } },
          { phone: { contains: term } },
          { website: { contains: term } },
          { emails: { contains: term } },
          { category: { contains: term } },
          { assignedTo: { contains: term } },
        ],
      });
    }
  }

  if (query.minRating != null) and.push({ rating: { gte: query.minRating } });
  if (query.maxRating != null) and.push({ rating: { lte: query.maxRating } });
  if (query.minReviews != null)
    and.push({ reviewCount: { gte: query.minReviews } });
  if (query.maxReviews != null)
    and.push({ reviewCount: { lte: query.maxReviews } });

  if (query.hasWebsite === "true") and.push({ website: { not: null } });
  if (query.hasWebsite === "false") and.push({ website: null });

  // emails/socialLinks are stored as canonical JSON.stringify() output
  // (no formatting), so "[]" / "{}" reliably mean "none found".
  if (query.hasEmail === "true") and.push({ emails: { not: "[]" } });
  if (query.hasEmail === "false") and.push({ emails: "[]" });

  if (query.hasSocial === "true") and.push({ socialLinks: { not: "{}" } });
  if (query.hasSocial === "false") and.push({ socialLinks: "{}" });

  if (query.hasWhatsapp === "true") and.push({ hasWhatsapp: true });
  if (query.hasWhatsapp === "false") and.push({ hasWhatsapp: false });

  const platforms = splitCsv(query.socialPlatforms);
  if (platforms) {
    and.push({
      OR: platforms.map((p) => ({ socialLinks: { contains: `"${p}":` } })),
    });
  }

  const businessStatuses = splitCsv(query.businessStatus);
  if (businessStatuses) and.push({ businessStatus: { in: businessStatuses } });

  const statuses = splitCsv(query.status);
  if (statuses) and.push({ status: { in: statuses } });

  const enrichmentStatuses = splitCsv(query.enrichmentStatus);
  if (enrichmentStatuses)
    and.push({ enrichmentStatus: { in: enrichmentStatuses } });

  const businessSizes = splitCsv(query.businessSizeEstimate);
  if (businessSizes) and.push({ businessSizeEstimate: { in: businessSizes } });

  if (query.favourite === "true") and.push({ favourite: true });
  if (query.favourite === "false") and.push({ favourite: false });

  // Archived leads are hidden from the default view unless explicitly requested.
  if (query.archived === "true") {
    and.push({ archived: true });
  } else {
    and.push({ archived: false });
  }

  return and.length > 0 ? { AND: and } : {};
}

export function buildLeadsOrderBy(
  query: LeadsQuery
): Prisma.LeadOrderByWithRelationInput {
  const field = query.sortBy && SORTABLE_FIELDS.has(query.sortBy) ? query.sortBy : "createdAt";
  return { [field]: query.sortDir } as Prisma.LeadOrderByWithRelationInput;
}
