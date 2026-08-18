import { NextResponse } from "next/server";
import { estimateSearchCost } from "@/lib/cost";
import { estimateCostSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = estimateCostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const estimate = estimateSearchCost(
    parsed.data.keyword,
    parsed.data.maxLeads,
    parsed.data.searchMode,
    parsed.data.fields
  );
  return NextResponse.json(estimate);
}
