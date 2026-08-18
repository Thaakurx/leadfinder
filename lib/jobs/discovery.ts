import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  GeocodingError,
  GooglePlacesApiError,
  discoverPlaces,
  geocodeLocation,
} from "@/lib/google-places";
import type { OptionalPlaceField, SearchMode } from "@/lib/types";
import { getGooglePlacesApiKey } from "@/lib/settings";
import { enqueueEnrichment } from "./enrichment";
import { clearJobControl, getJobControl, waitWhilePaused } from "./control";

// Runs Stage 1 (discovery) for a Search row in the background. Intended to
// be called fire-and-forget from an API route: the route responds
// immediately with the created Search id, and the UI polls
// GET /api/searches/[id] for jobStatus/jobProgress.
//
// NOTE: this relies on the Node process staying alive after the HTTP
// response is sent, which holds for `next dev` / `next start` (a
// long-running server) but NOT for serverless platforms like Vercel, where
// background work is frozen once the response is returned. If you deploy
// there later, move this to a real queue (see README).
export async function runDiscoveryJob(searchId: string) {
  const search = await prisma.search.findUnique({ where: { id: searchId } });
  if (!search) return;

  const apiKey = await getGooglePlacesApiKey();
  if (!apiKey) {
    await prisma.search.update({
      where: { id: searchId },
      data: {
        jobStatus: "failed",
        jobError:
          "No Google Places API key configured. Add one in Settings, or set GOOGLE_PLACES_API_KEY in .env.local.",
      },
    });
    return;
  }

  const startedAt = Date.now();

  await prisma.search.update({
    where: { id: searchId },
    data: { jobStatus: "running", jobProgress: 0, jobError: null },
  });

  try {
    let lat = search.lat;
    let lng = search.lng;

    if (lat == null || lng == null) {
      const geo = await geocodeLocation(
        search.location,
        apiKey,
        search.language ?? undefined
      );
      lat = geo.lat;
      lng = geo.lng;
      await prisma.search.update({
        where: { id: searchId },
        data: { lat, lng },
      });
    }

    let processed = 0;
    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    let cancelled = false;

    let fields: OptionalPlaceField[] = [];
    try {
      fields = JSON.parse(search.fields);
    } catch {
      fields = [];
    }

    await discoverPlaces({
      apiKey,
      keyword: search.keyword,
      lat,
      lng,
      radiusMeters: search.radius,
      maxResults: search.maxLeads,
      searchMode: search.searchMode as SearchMode,
      language: search.language ?? undefined,
      openClosed: search.openClosed as "any" | "open" | "closed",
      fields,
      onPage: async (places) => {
        for (const place of places) {
          const existing = await prisma.lead.findUnique({
            where: { placeId: place.placeId },
            select: { id: true },
          });
          if (existing) {
            duplicateCount++;
            continue;
          }

          const data = {
            name: place.name,
            category: JSON.stringify(place.category),
            primaryType: place.primaryType,
            address: place.address,
            phone: place.phone,
            website: place.website,
            rating: place.rating,
            reviewCount: place.reviewCount,
            businessStatus: place.businessStatus,
            priceLevel: place.priceLevel,
            lat: place.lat,
            lng: place.lng,
            openingHours: place.openingHours
              ? JSON.stringify(place.openingHours)
              : null,
            searchId: search.id,
          };
          try {
            await prisma.lead.create({ data: { placeId: place.placeId, ...data } });
            successCount++;
          } catch (err) {
            // Race: another concurrent job inserted this placeId between the
            // findUnique check above and this create. Treat as a duplicate,
            // not a genuine write failure.
            if (
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P2002"
            ) {
              duplicateCount++;
            } else {
              failedCount++;
            }
          }
        }
        processed += places.length;
        const progress = Math.min(
          99,
          Math.round((processed / search.maxLeads) * 100)
        );
        await prisma.search.update({
          where: { id: searchId },
          data: {
            jobProgress: progress,
            leadCount: successCount,
            successCount,
            failedCount,
            duplicateCount,
          },
        });

        const control = getJobControl(searchId);
        if (control === "cancelled") {
          cancelled = true;
          return false;
        }
        if (control === "paused") {
          await prisma.search.update({
            where: { id: searchId },
            data: { jobStatus: "paused" },
          });
          const outcome = await waitWhilePaused(searchId);
          if (outcome === "cancelled") {
            cancelled = true;
            return false;
          }
          await prisma.search.update({
            where: { id: searchId },
            data: { jobStatus: "running" },
          });
        }
        return true;
      },
    });

    clearJobControl(searchId);

    await prisma.search.update({
      where: { id: searchId },
      data: {
        jobStatus: cancelled ? "cancelled" : "completed",
        jobProgress: cancelled ? processed > 0 ? Math.round((processed / search.maxLeads) * 100) : 0 : 100,
        leadCount: successCount,
        successCount,
        failedCount,
        duplicateCount,
        durationMs: Date.now() - startedAt,
      },
    });

    const pendingLeads = await prisma.lead.findMany({
      where: {
        searchId,
        website: { not: null },
        enrichmentStatus: "pending",
      },
      select: { id: true },
    });
    if (pendingLeads.length > 0) {
      enqueueEnrichment(pendingLeads.map((l) => l.id));
    }
  } catch (err) {
    clearJobControl(searchId);
    const message =
      err instanceof GooglePlacesApiError || err instanceof GeocodingError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Unknown error during discovery";
    await prisma.search.update({
      where: { id: searchId },
      data: {
        jobStatus: "failed",
        jobError: message,
        durationMs: Date.now() - startedAt,
      },
    });
  }
}
