// Tiny concurrency limiter (no external dependency). Used to cap how many
// enrichment crawls run in parallel across all domains.
export function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= concurrency) return;
    const run = queue.shift();
    if (!run) return;
    active++;
    run();
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}

// Per-domain rate limiter: ensures at most one request per `minIntervalMs`
// to a given hostname, so enrichment crawling is a good web citizen even
// when several leads share the same domain.
const globalForLimiter = globalThis as unknown as {
  __domainLastRequestAt?: Map<string, number>;
};
const lastRequestAtByDomain =
  globalForLimiter.__domainLastRequestAt ?? new Map<string, number>();
globalForLimiter.__domainLastRequestAt = lastRequestAtByDomain;

export async function waitForDomainSlot(domain: string, minIntervalMs: number) {
  const last = lastRequestAtByDomain.get(domain) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < minIntervalMs) {
    await new Promise((r) => setTimeout(r, minIntervalMs - elapsed));
  }
  lastRequestAtByDomain.set(domain, Date.now());
}
