import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeTemplate } from "@/lib/serializers";
import { updateTemplateSchema } from "@/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const template = await prisma
    .$transaction(async (tx) => {
      // Only one template may be the default at a time — clear any other
      // before setting this one, so the two updates commit atomically.
      if (parsed.data.isDefault === true) {
        await tx.messageTemplate.updateMany({
          where: { id: { not: params.id }, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.messageTemplate.update({ where: { id: params.id }, data: parsed.data });
    })
    .catch(() => null);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template: serializeTemplate(template) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.messageTemplate.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
