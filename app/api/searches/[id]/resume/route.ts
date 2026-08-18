import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setJobControl } from "@/lib/jobs/control";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const search = await prisma.search.findUnique({ where: { id: params.id } });
  if (!search) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
  }
  if (search.jobStatus !== "paused") {
    return NextResponse.json(
      { error: "Search is not paused" },
      { status: 400 }
    );
  }
  setJobControl(params.id, "running");
  return NextResponse.json({ ok: true });
}
