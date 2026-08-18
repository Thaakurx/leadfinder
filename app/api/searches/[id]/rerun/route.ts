import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeSearch } from "@/lib/serializers";
import { estimateSearchCost } from "@/lib/cost";
import { runDiscoveryJob } from "@/lib/jobs/discovery";
import type { OptionalPlaceField, SearchMode } from "@/lib/types";
import { getGooglePlacesApiKey } from "@/lib/settings";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const original = await prisma.search.findUnique({ where: { id: params.id } });
  if (!original) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
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

  let fields: OptionalPlaceField[] = [];
  try {
    fields = JSON.parse(original.fields);
  } catch {
    fields = [];
  }

  const cost = estimateSearchCost(
    original.keyword,
    original.maxLeads,
    original.searchMode as SearchMode,
    fields
  );

  const search = await prisma.search.create({
    data: {
      searchMode: original.searchMode,
      keyword: original.keyword,
      location: original.location,
      lat: original.lat,
      lng: original.lng,
      radius: original.radius,
      maxLeads: original.maxLeads,
      language: original.language,
      openClosed: original.openClosed,
      filters: original.filters,
      fields: original.fields,
      costEstimate: cost.estimatedCostUsd,
      jobStatus: "pending",
    },
  });

  runDiscoveryJob(search.id).catch((err) => {
    console.error(`Discovery job ${search.id} crashed`, err);
  });

  return NextResponse.json({ search: serializeSearch(search) }, { status: 201 });
}
