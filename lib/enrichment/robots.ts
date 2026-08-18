import robotsParser from "robots-parser";

const USER_AGENT = "LeadFinderBot/1.0 (+outreach enrichment; reads only public contact info)";
const TTL_MS = 60 * 60 * 1000;

type Robots = ReturnType<typeof robotsParser>;

const globalForRobots = globalThis as unknown as {
  __robotsCache?: Map<string, { robots: Robots; fetchedAt: number }>;
};
const cache =
  globalForRobots.__robotsCache ??
  new Map<string, { robots: Robots; fetchedAt: number }>();
globalForRobots.__robotsCache = cache;

export async function isAllowedByRobots(
  url: string,
  timeoutMs: number
): Promise<boolean> {
  const origin = new URL(url).origin;
  const cached = cache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.robots.isAllowed(url, USER_AGENT) ?? true;
  }

  const robotsUrl = `${origin}/robots.txt`;
  let content = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    clearTimeout(timeout);
    if (res.ok) content = await res.text();
  } catch {
    // Unreachable robots.txt (or none present) — treat as allow-all, the
    // conventional default when a site has no crawling policy published.
    content = "";
  }

  const robots = robotsParser(robotsUrl, content);
  cache.set(origin, { robots, fetchedAt: Date.now() });
  return robots.isAllowed(url, USER_AGENT) ?? true;
}

export { USER_AGENT };
