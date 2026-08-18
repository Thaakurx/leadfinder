import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueEnrichment } from "@/lib/jobs/enrichment";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await prisma.lead.update({
    where: { id: params.id },
    data: { enrichmentStatus: "pending" },
  });
  // A manual per-row trigger always re-crawls, even if already resolved.
  enqueueEnrichment([params.id], { force: true });

  return NextResponse.json({ ok: true });
}
