import type { BusinessSizeEstimate } from "@/lib/types";

/**
 * Crude review-count-based heuristic — Google's API doesn't expose employee
 * count or revenue, so this is only a rough proxy, not authoritative data.
 */
export function estimateBusinessSize(reviewCount: number | null): BusinessSizeEstimate {
  const reviews = reviewCount ?? 0;
  if (reviews >= 1000) return "enterprise";
  if (reviews >= 200) return "large";
  if (reviews >= 30) return "medium";
  return "small";
}
