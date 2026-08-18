import { NextResponse } from "next/server";
import { importCommitSchema } from "@/lib/validation";
import { importLeads } from "@/lib/import";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = importCommitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await importLeads(parsed.data.rows);
  return NextResponse.json(result);
}
