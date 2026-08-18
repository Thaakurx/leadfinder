import { prisma } from "./prisma";
import { extractDomain, normalizePhone } from "./dedupe";
import { serializeLead } from "./serializers";
import type { LeadDTO } from "./types";

export interface DuplicateGroup {
  key: string;
  matchedOn: "phone" | "website";
  leads: LeadDTO[];
}

/**
 * Groups leads that share a normalized phone number or website domain.
 * Place-ID matches never happen here since placeId is unique per lead.
 */
export async function findDuplicateGroups(): Promise<DuplicateGroup[]> {
  const leads = await prisma.lead.findMany({ where: { archived: false } });

  const byPhone = new Map<string, typeof leads>();
  const byDomain = new Map<string, typeof leads>();

  for (const lead of leads) {
    if (lead.phone) {
      const key = normalizePhone(lead.phone);
      if (key.length >= 7) {
        const group = byPhone.get(key) ?? [];
        group.push(lead);
        byPhone.set(key, group);
      }
    }
    if (lead.website) {
      const domain = extractDomain(lead.website);
      if (domain) {
        const group = byDomain.get(domain) ?? [];
        group.push(lead);
        byDomain.set(domain, group);
      }
    }
  }

  const seen = new Set<string>();
  const groups: DuplicateGroup[] = [];

  for (const [key, group] of byPhone) {
    if (group.length < 2) continue;
    groups.push({
      key: `phone:${key}`,
      matchedOn: "phone",
      leads: group.map(serializeLead),
    });
    for (const lead of group) seen.add(lead.id);
  }

  for (const [domain, group] of byDomain) {
    const unseen = group.filter((l) => !seen.has(l.id));
    if (group.length < 2) continue;
    groups.push({
      key: `website:${domain}`,
      matchedOn: "website",
      leads: group.map(serializeLead),
    });
    for (const lead of unseen) seen.add(lead.id);
  }

  return groups;
}

/**
 * Merges `duplicateIds` into `primaryId`: fills any blank field on the
 * primary from the first duplicate that has it, unions emails/social
 * links/tags, then deletes the duplicate rows.
 */
export async function mergeLeads(primaryId: string, duplicateIds: string[]) {
  const primary = await prisma.lead.findUnique({ where: { id: primaryId } });
  if (!primary) throw new Error("Primary lead not found");

  const duplicates = await prisma.lead.findMany({
    where: { id: { in: duplicateIds.filter((id) => id !== primaryId) } },
  });

  const emails = new Set<string>(JSON.parse(primary.emails || "[]"));
  const tags = new Set<string>(JSON.parse(primary.tags || "[]"));
  const socialLinks: Record<string, string> = JSON.parse(primary.socialLinks || "{}");

  let phone = primary.phone;
  let website = primary.website;
  let address = primary.address;
  let notes = primary.notes;

  for (const dup of duplicates) {
    for (const email of JSON.parse(dup.emails || "[]") as string[]) emails.add(email);
    for (const tag of JSON.parse(dup.tags || "[]") as string[]) tags.add(tag);
    const dupSocial: Record<string, string> = JSON.parse(dup.socialLinks || "{}");
    for (const [platform, url] of Object.entries(dupSocial)) {
      if (!socialLinks[platform]) socialLinks[platform] = url;
    }
    if (!phone && dup.phone) phone = dup.phone;
    if (!website && dup.website) website = dup.website;
    if (!address && dup.address) address = dup.address;
    if (dup.notes) notes = notes ? `${notes}\n---\n${dup.notes}` : dup.notes;
  }

  const merged = await prisma.lead.update({
    where: { id: primaryId },
    data: {
      phone,
      website,
      address,
      notes,
      emails: JSON.stringify(Array.from(emails)),
      tags: JSON.stringify(Array.from(tags)),
      socialLinks: JSON.stringify(socialLinks),
    },
  });

  await prisma.lead.deleteMany({
    where: { id: { in: duplicates.map((d) => d.id) } },
  });

  return serializeLead(merged);
}
