import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeTemplate } from "@/lib/serializers";
import { templateSchema } from "@/lib/validation";

export async function GET() {
  const templates = await prisma.messageTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ templates: templates.map(serializeTemplate) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const template = await prisma.messageTemplate.create({ data: parsed.data });
  return NextResponse.json({ template: serializeTemplate(template) }, { status: 201 });
}
