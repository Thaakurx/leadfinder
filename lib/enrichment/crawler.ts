import { isAllowedByRobots, USER_AGENT } from "./robots";
import {
  extractBookingAndMenuLinks,
  extractCompanyDescription,
  extractEmails,
  extractSocialLinks,
  extractTechStack,
  findContactPageLinks,
} from "./extract";
import { checkSsl } from "./ssl";
import { waitForDomainSlot } from "@/lib/jobs/limiter";
import type { SocialLinks } from "@/lib/types";

export interface CrawlResult {
  emails: string[];
  socialLinks: SocialLinks;
  bookingLink: string | null;
  menuLink: string | null;
  companyDescription: string | null;
  techStack: string[];
  sslValid: boolean | null;
  sslIssuer: string | null;
  sslExpiresAt: Date | null;
}

// Thrown only for genuine network-level failures (DNS, timeout, connection
// refused) — as opposed to a reachable-but-unhelpful response (404, wrong
// content type), which is reported as a soft `null` "nothing here."
export class FetchFailure extends Error {}

async function fetchPage(
  url: string,
  timeoutMs: number
): Promise<{ html: string; poweredBy: string | null } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    const html = await res.text();
    return { html, poweredBy: res.headers.get("x-powered-by") };
  } catch (err) {
    if (controller.signal.aborted) {
      throw new FetchFailure(`Timed out after ${timeoutMs}ms`);
    }
    // Node's fetch wraps the real reason (ENOTFOUND, ECONNREFUSED, etc.) in
    // `.cause` and just says "fetch failed" at the top level — surface the
    // cause when present so the stored error is actually diagnostic.
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : null;
    throw new FetchFailure(
      cause ?? (err instanceof Error ? err.message : "Network error while fetching website")
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Crawls a business's own website for publicly-listed contact info: emails,
 * social links, booking/menu links, company description, and best-effort
 * tech-stack/SSL signals. Checks the homepage first, then up to 3 same-
 * origin "Contact"/"About" pages if no email was found on the homepage.
 * Respects robots.txt and rate-limits per domain.
 */
export async function crawlWebsiteForContact(websiteUrl: string): Promise<CrawlResult> {
  const timeoutMs = Number(process.env.ENRICHMENT_TIMEOUT_MS) || 8000;
  const requestsPerSecond =
    Number(process.env.ENRICHMENT_REQUESTS_PER_SECOND_PER_DOMAIN) || 1;
  const minIntervalMs = 1000 / Math.max(requestsPerSecond, 0.1);

  const homepage = new URL(websiteUrl);
  const domain = homepage.hostname;

  const emails = new Set<string>();
  const socialLinks: SocialLinks = {};
  const techStack = new Set<string>();
  let bookingLink: string | null = null;
  let menuLink: string | null = null;
  let companyDescription: string | null = null;

  const visitPage = async (
    pageUrl: string,
    opts: { required?: boolean } = {}
  ): Promise<string | null> => {
    const allowed = await isAllowedByRobots(pageUrl, timeoutMs);
    if (!allowed) return null;
    await waitForDomainSlot(domain, minIntervalMs);

    let page;
    try {
      page = await fetchPage(pageUrl, timeoutMs);
    } catch (err) {
      // A secondary Contact/About page being unreachable isn't fatal — we
      // already got the homepage. The homepage itself failing means we
      // never actually reached the site, which should surface as a real
      // failure rather than a silent "not_found".
      if (opts.required) throw err;
      return null;
    }
    if (!page) return null;
    const { html, poweredBy } = page;

    for (const email of extractEmails(html)) emails.add(email);
    for (const [platform, link] of Object.entries(
      extractSocialLinks(html, pageUrl)
    )) {
      if (!socialLinks[platform as keyof SocialLinks]) {
        socialLinks[platform as keyof SocialLinks] = link;
      }
    }
    for (const tech of extractTechStack(html, poweredBy)) techStack.add(tech);

    const links = extractBookingAndMenuLinks(html, pageUrl);
    if (!bookingLink) bookingLink = links.bookingLink;
    if (!menuLink) menuLink = links.menuLink;

    if (!companyDescription) companyDescription = extractCompanyDescription(html);

    return html;
  };

  const homeHtml = await visitPage(homepage.toString(), { required: true });

  if (homeHtml && emails.size === 0) {
    const candidateLinks = findContactPageLinks(homeHtml, homepage.toString());
    for (const link of candidateLinks) {
      if (emails.size > 0) break;
      await visitPage(link);
    }
  }

  const ssl = await checkSsl(domain, timeoutMs).catch(() => null);

  return {
    emails: Array.from(emails),
    socialLinks,
    bookingLink,
    menuLink,
    companyDescription,
    techStack: Array.from(techStack),
    sslValid: ssl?.valid ?? null,
    sslIssuer: ssl?.issuer ?? null,
    sslExpiresAt: ssl?.expiresAt ?? null,
  };
}
