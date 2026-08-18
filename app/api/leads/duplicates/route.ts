import { NextResponse } from "next/server";
import { findDuplicateGroups } from "@/lib/duplicates";

export async function GET() {
  const groups = await findDuplicateGroups();
  return NextResponse.json({ groups });
}
