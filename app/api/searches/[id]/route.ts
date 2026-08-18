import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeSearch } from "@/lib/serializers";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const search = await prisma.search.findUnique({ where: { id: params.id } });
  if (!search) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
  }
  return NextResponse.json({ search: serializeSearch(search) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.search.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
