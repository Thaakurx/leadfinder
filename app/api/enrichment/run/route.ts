import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enqueueEnrichment } from "@/lib/jobs/enrichment";

const runEnrichmentSchema = z.object({
  searchId: z.string().optional(),
  leadIds: z.array(z.string()).optional(),
  force: z.boolean().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = runEnrichmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { searchId, leadIds, force } = parsed.data;

  let ids: string[];
  if (leadIds && leadIds.length > 0) {
    ids = leadIds;
  } else {
    const where = {
      website: { not: null },
      ...(searchId ? { searchId } : {}),
      ...(force ? {} : { enrichmentStatus: { in: ["pending", "failed"] } }),
    };
    const leads = await prisma.lead.findMany({
      where,
      select: { id: true },
      take: 500,
    });
    ids = leads.map((l) => l.id);
  }

  if (ids.length === 0) {
    return NextResponse.json({ queued: 0 });
  }

  await prisma.lead.updateMany({
    where: { id: { in: ids } },
    data: { enrichmentStatus: "pending" },
  });
  enqueueEnrichment(ids, { force });

  return NextResponse.json({ queued: ids.length });
}
