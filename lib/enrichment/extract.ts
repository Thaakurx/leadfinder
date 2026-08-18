import * as cheerio from "cheerio";
import type { SocialLinks, SocialPlatform } from "@/lib/types";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i;
// Common tracking-pixel / placeholder / template-example domains that show
// up in scraped HTML but are never a real business contact address.
const JUNK_DOMAINS = new Set([
  "sentry.io",
  "wixpress.com",
  "example.com",
  "godaddy.com",
  "domain.com",
  "yourdomain.com",
  "yoursite.com",
  "email.com",
]);

export function extractEmails(html: string): string[] {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();

  const found = new Set<string>();

  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
    if (email) found.add(email.toLowerCase());
  });

  const text = $("body").text();
  const matches = text.match(EMAIL_REGEX) ?? [];
  for (const m of matches) found.add(m.toLowerCase());

  return Array.from(found).filter((email) => {
    if (IMAGE_EXT_REGEX.test(email)) return false;
    const domain = email.split("@")[1] ?? "";
    if (JUNK_DOMAINS.has(domain)) return false;
    return true;
  });
}

const SOCIAL_PATTERNS: Record<SocialPlatform, RegExp> = {
  facebook: /(?:facebook\.com|fb\.com)\/(?!sharer|share|plugins|tr\?)/i,
  instagram: /instagram\.com\/(?!p\/|reel\/|explore\/)/i,
  linkedin: /linkedin\.com\/(company|in|school)\//i,
  twitter: /(?:twitter\.com|x\.com)\/(?!intent|share|hashtag)/i,
  youtube: /youtube\.com\/(channel|c|user|@)/i,
  tiktok: /tiktok\.com\/@/i,
  whatsapp: /(?:wa\.me|api\.whatsapp\.com)\//i,
  pinterest: /pinterest\.(?:com|[a-z]{2})\/(?!pin\/)/i,
  telegram: /(?:t\.me|telegram\.me)\//i,
  threads: /threads\.net\/@/i,
  snapchat: /snapchat\.com\/add\//i,
  discord: /discord\.(?:gg|com\/invite)\//i,
};

export function extractSocialLinks(html: string, baseUrl: string): SocialLinks {
  const $ = cheerio.load(html);
  const links: SocialLinks = {};

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS) as [
      SocialPlatform,
      RegExp,
    ][]) {
      if (links[platform] || !pattern.test(href)) continue;
      try {
        links[platform] = new URL(href, baseUrl).toString();
      } catch {
        // ignore malformed href
      }
    }
  });

  return links;
}

export function findContactPageLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const candidates = new Set<string>();
  const base = new URL(baseUrl);

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().toLowerCase();
    if (/contact|about/i.test(href) || /contact|about/i.test(text)) {
      try {
        const resolved = new URL(href, baseUrl);
        if (resolved.origin === base.origin) {
          candidates.add(resolved.toString());
        }
      } catch {
        // ignore invalid URLs
      }
    }
  });

  return Array.from(candidates).slice(0, 3);
}

export function extractCompanyDescription(html: string): string | null {
  const $ = cheerio.load(html);
  const metaDescription = $('meta[name="description"]').attr("content");
  const ogDescription = $('meta[property="og:description"]').attr("content");
  const description = (metaDescription || ogDescription || "").trim();
  return description ? description.slice(0, 500) : null;
}

// Best-effort HTML signature matching for CMS platforms and marketing
// tooling — not exhaustive, and a site can suppress or obfuscate all of
// these signals, so treat this as a hint rather than ground truth.
const TECH_SIGNATURES: Array<{ label: string; pattern: RegExp }> = [
  { label: "WordPress", pattern: /wp-content|wp-includes|generator"\s+content="WordPress/i },
  { label: "Shopify", pattern: /cdn\.shopify\.com|Shopify\.theme|shopify-checkout-api-token/i },
  { label: "Wix", pattern: /static\.wixstatic\.com|generator"\s+content="Wix\.com/i },
  { label: "Squarespace", pattern: /static1\.squarespace\.com|generator"\s+content="Squarespace/i },
  { label: "Webflow", pattern: /webflow\.js|data-wf-site=/i },
  { label: "Next.js", pattern: /__NEXT_DATA__|\/_next\/static/i },
  { label: "Google Analytics", pattern: /google-analytics\.com\/analytics\.js|gtag\(['"]config['"]/i },
  { label: "Google Tag Manager", pattern: /googletagmanager\.com\/gtm\.js/i },
  { label: "Meta Pixel", pattern: /connect\.facebook\.net\/.*\/fbevents\.js|fbq\(['"]init['"]/i },
  { label: "Intercom Chat", pattern: /widget\.intercom\.io/i },
  { label: "Drift Chat", pattern: /js\.driftt\.com/i },
  { label: "Tawk.to Chat", pattern: /embed\.tawk\.to/i },
  { label: "Crisp Chat", pattern: /client\.crisp\.chat/i },
  { label: "Zendesk Chat", pattern: /static\.zdassets\.com/i },
];

export function extractTechStack(html: string, poweredByHeader?: string | null): string[] {
  const found = new Set<string>();
  for (const { label, pattern } of TECH_SIGNATURES) {
    if (pattern.test(html)) found.add(label);
  }
  if (poweredByHeader) {
    if (/php/i.test(poweredByHeader)) found.add("PHP");
    if (/express/i.test(poweredByHeader)) found.add("Express");
    if (/asp\.net/i.test(poweredByHeader)) found.add("ASP.NET");
  }
  return Array.from(found);
}

const BOOKING_PATTERNS = [
  /calendly\.com/i,
  /squareup\.com\/appointments/i,
  /square\.site/i,
  /opentable\.com/i,
  /resy\.com/i,
  /acuityscheduling\.com/i,
  /setmore\.com/i,
];

export function extractBookingAndMenuLinks(
  html: string,
  baseUrl: string
): { bookingLink: string | null; menuLink: string | null } {
  const $ = cheerio.load(html);
  let bookingLink: string | null = null;
  let menuLink: string | null = null;

  $("a[href]").each((_, el) => {
    if (bookingLink && menuLink) return;
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().toLowerCase().trim();

    if (!bookingLink) {
      const isBookingHost = BOOKING_PATTERNS.some((p) => p.test(href));
      const isBookingText = /book\s*(a|an)?\s*(appointment|table|now|online)/i.test(text);
      if (isBookingHost || isBookingText) {
        try {
          bookingLink = new URL(href, baseUrl).toString();
        } catch {
          // ignore malformed href
        }
      }
    }

    if (!menuLink) {
      const isMenuText = /^menu$|our menu|view menu|full menu/i.test(text);
      const isMenuHref = /\/menu\b/i.test(href);
      if (isMenuText || isMenuHref) {
        try {
          menuLink = new URL(href, baseUrl).toString();
        } catch {
          // ignore malformed href
        }
      }
    }
  });

  return { bookingLink, menuLink };
}
