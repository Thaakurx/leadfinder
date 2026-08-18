import type { LeadDTO } from "./types";

export function renderTemplate(body: string, lead: LeadDTO): string {
  const replacements: Record<string, string> = {
    "[Name]": lead.contactName?.trim() || lead.name,
    "[Business Name]": lead.name,
    "[Address]": lead.address ?? "",
    "[Phone]": lead.phone ?? "",
    "[Website]": lead.website ?? "",
    "[Category]": lead.category[0]?.replaceAll("_", " ") ?? "",
  };

  let result = body;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.split(token).join(value);
  }
  return result;
}
