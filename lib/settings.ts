import { prisma } from "./prisma";

export const GOOGLE_PLACES_API_KEY_SETTING = "googlePlacesApiKey";

// DB-stored value (set via the Settings dialog) wins; .env.local is the
// fallback for people who prefer file-based config or are running headless.
export async function getGooglePlacesApiKey(): Promise<string | null> {
  const row = await prisma.setting.findUnique({
    where: { key: GOOGLE_PLACES_API_KEY_SETTING },
  });
  const dbValue = row?.value.trim();
  if (dbValue) return dbValue;
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

export async function setGooglePlacesApiKey(value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key: GOOGLE_PLACES_API_KEY_SETTING },
    update: { value },
    create: { key: GOOGLE_PLACES_API_KEY_SETTING, value },
  });
}
