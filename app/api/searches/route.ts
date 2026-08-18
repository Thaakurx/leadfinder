import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeSearch } from "@/lib/serializers";
import { estimateSearchCost } from "@/lib/cost";
import { createSearchSchema } from "@/lib/validation";
import { runDiscoveryJob } from "@/lib/jobs/discovery";
import { getGooglePlacesApiKey } from "@/lib/settings";

export async function GET() {
  const searches = await prisma.search.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ searches: searches.map(serializeSearch) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!(await getGooglePlacesApiKey())) {
    return NextResponse.json(
      {
        error:
          "No Google Places API key configured. Add one in Settings, or set GOOGLE_PLACES_API_KEY in .env.local.",
      },
      { status: 400 }
    );
  }

  const { searchMode, keyword, location, radiusKm, maxLeads, language, openClosed, filters, fields } =
    parsed.data;
  const cost = estimateSearchCost(keyword, maxLeads, searchMode, fields);

  const search = await prisma.search.create({
    data: {
      searchMode,
      keyword,
      location,
      radius: radiusKm * 1000,
      maxLeads,
      language: language || null,
      openClosed,
      filters: JSON.stringify(filters ?? {}),
      fields: JSON.stringify(fields),
      costEstimate: cost.estimatedCostUsd,
      jobStatus: "pending",
    },
  });

  // Fire-and-forget: the route responds immediately, the job updates the
  // Search row as it progresses, and the client polls for status.
  runDiscoveryJob(search.id).catch((err) => {
    console.error(`Discovery job ${search.id} crashed`, err);
  });

  return NextResponse.json({ search: serializeSearch(search) }, { status: 201 });
}
