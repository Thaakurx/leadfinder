import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeLead } from "@/lib/serializers";
import { updateLeadSchema } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json({ lead: serializeLead(lead) });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tags, ...rest } = parsed.data;
  const lead = await prisma.lead
    .update({
      where: { id: params.id },
      data: { ...rest, ...(tags ? { tags: JSON.stringify(tags) } : {}) },
    })
    .catch(() => null);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({ lead: serializeLead(lead) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.lead.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
