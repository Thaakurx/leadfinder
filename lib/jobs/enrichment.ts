import { prisma } from "@/lib/prisma";
import { crawlWebsiteForContact } from "@/lib/enrichment/crawler";
import { verifyEmailSyntaxAndMx } from "@/lib/enrichment/verify";
import { estimateBusinessSize } from "@/lib/enrichment/business-size";
import { createLimiter } from "./limiter";

// Caps how many website crawls run in parallel across all domains. Each
// individual domain is additionally throttled to ~1 req/sec by the crawler
// (see lib/enrichment/crawler.ts + lib/jobs/limiter.ts).
const CONCURRENCY = Number(process.env.ENRICHMENT_CONCURRENCY) || 5;
const limit = createLimiter(CONCURRENCY);

export async function runEnrichmentForLead(
  leadId: string,
  opts: { force?: boolean } = {}
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  const businessSizeEstimate = estimateBusinessSize(lead.reviewCount);

  if (!lead.website) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        enrichmentStatus: "not_found",
        enrichmentError: "No website to crawl",
        enrichedAt: new Date(),
        businessSizeEstimate,
      },
    });
    return;
  }

  // Resumable/cached by lead (place_id-backed): skip leads already resolved
  // unless the caller explicitly wants a re-crawl.
  if (!opts.force && ["found", "not_found"].includes(lead.enrichmentStatus)) {
    return;
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { enrichmentStatus: "running", enrichmentError: null },
  });

  try {
    const result = await crawlWebsiteForContact(lead.website);
    const found =
      result.emails.length > 0 || Object.keys(result.socialLinks).length > 0;

    const emailVerified =
      result.emails.length > 0 ? await verifyEmailSyntaxAndMx(result.emails[0]) : null;

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        emails: JSON.stringify(result.emails),
        emailVerified,
        socialLinks: JSON.stringify(result.socialLinks),
        bookingLink: result.bookingLink,
        menuLink: result.menuLink,
        companyDescription: result.companyDescription,
        techStack: JSON.stringify(result.techStack),
        sslValid: result.sslValid,
        sslIssuer: result.sslIssuer,
        sslExpiresAt: result.sslExpiresAt,
        businessSizeEstimate,
        enrichmentStatus: found ? "found" : "not_found",
        enrichmentError: null,
        enrichedAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        enrichmentStatus: "failed",
        enrichmentError:
          err instanceof Error ? err.message : "Unknown enrichment error",
        enrichedAt: new Date(),
        businessSizeEstimate,
      },
    });
  }
}

export function enqueueEnrichment(
  leadIds: string[],
  opts: { force?: boolean } = {}
) {
  for (const id of leadIds) {
    limit(() => runEnrichmentForLead(id, opts)).catch((err) => {
      console.error(`Enrichment for lead ${id} crashed`, err);
    });
  }
}
