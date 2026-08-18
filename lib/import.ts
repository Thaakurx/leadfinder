import { prisma } from "./prisma";
import { extractDomain, normalizePhone } from "./dedupe";
import type { LeadStatus } from "./types";

export interface ImportRowInput {
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
  status?: LeadStatus;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function randomImportId(): string {
  return `import:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Merges imported rows into the Lead table. Dedupe priority: mapped
 * place_id (exact match with an existing Google-sourced lead) > normalized
 * phone number > website domain. Rows matching nothing are created fresh
 * with a synthetic placeId (imports have no real Google place_id).
 */
export async function importLeads(rows: ImportRowInput[]): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  const existingLeads = await prisma.lead.findMany();
  const byPlaceId = new Map(existingLeads.map((l) => [l.placeId, l]));
  const byPhone = new Map<string, (typeof existingLeads)[number]>();
  const byDomain = new Map<string, (typeof existingLeads)[number]>();
  for (const lead of existingLeads) {
    if (lead.phone) byPhone.set(normalizePhone(lead.phone), lead);
    if (lead.website) {
      const domain = extractDomain(lead.website);
      if (domain) byDomain.set(domain, lead);
    }
  }

  for (const row of rows) {
    if (!row.name.trim()) {
      result.skipped++;
      result.errors.push("Row skipped: missing business name");
      continue;
    }

    try {
      let existing = row.placeId ? byPlaceId.get(row.placeId) : undefined;
      if (!existing && row.phone) {
        existing = byPhone.get(normalizePhone(row.phone));
      }
      if (!existing && row.website) {
        const domain = extractDomain(row.website);
        if (domain) existing = byDomain.get(domain);
      }

      const categoryArray = row.category
        ? row.category.split(/[,;]/).map((c) => c.trim()).filter(Boolean)
        : undefined;

      const data = {
        name: row.name.trim(),
        ...(row.phone ? { phone: row.phone } : {}),
        ...(row.website ? { website: row.website } : {}),
        ...(row.address ? { address: row.address } : {}),
        ...(categoryArray ? { category: JSON.stringify(categoryArray) } : {}),
        ...(row.rating != null ? { rating: row.rating } : {}),
        ...(row.reviewCount != null ? { reviewCount: row.reviewCount } : {}),
        ...(row.notes ? { notes: row.notes } : {}),
        ...(row.status ? { status: row.status } : {}),
        ...(row.email
          ? {
              emails: JSON.stringify([row.email]),
              enrichmentStatus: "found" as const,
              enrichedAt: new Date(),
            }
          : {}),
      };

      if (existing) {
        const updated = await prisma.lead.update({
          where: { id: existing.id },
          data,
        });
        result.updated++;
        if (row.phone) byPhone.set(normalizePhone(row.phone), updated);
        if (row.website) {
          const domain = extractDomain(row.website);
          if (domain) byDomain.set(domain, updated);
        }
      } else {
        const placeId = row.placeId || randomImportId();
        const created = await prisma.lead.create({
          data: {
            placeId,
            category: categoryArray ? JSON.stringify(categoryArray) : "[]",
            ...data,
          },
        });
        result.created++;
        byPlaceId.set(placeId, created);
        if (row.phone) byPhone.set(normalizePhone(row.phone), created);
        if (row.website) {
          const domain = extractDomain(row.website);
          if (domain) byDomain.set(domain, created);
        }
      }
    } catch (err) {
      result.errors.push(
        `Row "${row.name}": ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  return result;
}
