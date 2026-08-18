import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GOOGLE_PLACES_API_KEY_SETTING, setGooglePlacesApiKey } from "@/lib/settings";
import { updateSettingsSchema } from "@/lib/validation";

// Never echoes the actual key back to the client — write-only from the UI's
// perspective, like a password field. Only tells the UI whether one is set
// and where it came from.
export async function GET() {
  const row = await prisma.setting.findUnique({
    where: { key: GOOGLE_PLACES_API_KEY_SETTING },
  });
  const dbKeySet = !!row?.value.trim();
  const envKeySet = !!process.env.GOOGLE_PLACES_API_KEY?.trim();

  return NextResponse.json({
    googlePlacesApiKey: {
      hasKey: dbKeySet || envKeySet,
      source: dbKeySet ? "database" : envKeySet ? "env" : "none",
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await setGooglePlacesApiKey(parsed.data.googlePlacesApiKey);
  return NextResponse.json({ ok: true });
}
