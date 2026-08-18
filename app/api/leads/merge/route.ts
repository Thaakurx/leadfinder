import { NextResponse } from "next/server";
import { mergeLeadsSchema } from "@/lib/validation";
import { mergeLeads } from "@/lib/duplicates";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = mergeLeadsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const lead = await mergeLeads(parsed.data.primaryId, parsed.data.duplicateIds);
    return NextResponse.json({ lead });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Merge failed" },
      { status: 400 }
    );
  }
}
