import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeLead } from "@/lib/serializers";
import { buildLeadsOrderBy, buildLeadsWhere } from "@/lib/leads-query";
import { bulkDeleteLeadsSchema, bulkUpdateLeadsSchema, leadsQuerySchema } from "@/lib/validation";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = leadsQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const query = parsed.data;
  const where = buildLeadsWhere(query);
  const orderBy = buildLeadsOrderBy(query);

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads: leads.map(serializeLead),
    total,
    page: query.page,
    pageSize: query.pageSize,
  });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bulkUpdateLeadsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { ids, status, favourite, archived, assignedTo, addTags } = parsed.data;

  if (
    status == null &&
    favourite == null &&
    archived == null &&
    assignedTo == null &&
    !addTags?.length
  ) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const sharedData = {
    ...(status ? { status } : {}),
    ...(favourite != null ? { favourite } : {}),
    ...(archived != null ? { archived } : {}),
    ...(assignedTo !== undefined ? { assignedTo } : {}),
  };

  if (addTags && addTags.length > 0) {
    // Tags are per-row JSON, so merging requires reading each lead first.
    const leads = await prisma.lead.findMany({
      where: { id: { in: ids } },
      select: { id: true, tags: true },
    });
    let updated = 0;
    for (const lead of leads) {
      const existing: string[] = JSON.parse(lead.tags || "[]");
      const merged = Array.from(new Set([...existing, ...addTags]));
      await prisma.lead.update({
        where: { id: lead.id },
        data: { ...sharedData, tags: JSON.stringify(merged) },
      });
      updated++;
    }
    return NextResponse.json({ updated });
  }

  const result = await prisma.lead.updateMany({
    where: { id: { in: ids } },
    data: sharedData,
  });
  return NextResponse.json({ updated: result.count });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bulkDeleteLeadsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const result = await prisma.lead.deleteMany({
    where: { id: { in: parsed.data.ids } },
  });
  return NextResponse.json({ deleted: result.count });
}
