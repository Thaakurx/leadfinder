import ExcelJS from "exceljs";
import type { LeadDTO } from "./types";

export const EXPORT_COLUMNS = [
  { key: "name", header: "Business Name" },
  { key: "category", header: "Category" },
  { key: "address", header: "Full Address" },
  { key: "phone", header: "Phone Number" },
  { key: "website", header: "Website URL" },
  { key: "rating", header: "Google Rating" },
  { key: "reviewCount", header: "Review Count" },
  { key: "businessStatus", header: "Business Status" },
  { key: "lat", header: "Latitude" },
  { key: "lng", header: "Longitude" },
  { key: "emails", header: "Email(s)" },
  { key: "emailVerified", header: "Email Verified" },
  { key: "facebook", header: "Facebook" },
  { key: "instagram", header: "Instagram" },
  { key: "linkedin", header: "LinkedIn" },
  { key: "twitter", header: "X / Twitter" },
  { key: "youtube", header: "YouTube" },
  { key: "tiktok", header: "TikTok" },
  { key: "whatsapp", header: "WhatsApp" },
  { key: "pinterest", header: "Pinterest" },
  { key: "telegram", header: "Telegram" },
  { key: "threads", header: "Threads" },
  { key: "snapchat", header: "Snapchat" },
  { key: "discord", header: "Discord" },
  { key: "bookingLink", header: "Booking Link" },
  { key: "menuLink", header: "Menu Link" },
  { key: "sslValid", header: "SSL Valid" },
  { key: "businessSizeEstimate", header: "Business Size (est.)" },
  { key: "placeId", header: "Place ID" },
  { key: "createdAt", header: "Date Added" },
  { key: "status", header: "Lead Status" },
  { key: "tags", header: "Tags" },
  { key: "favourite", header: "Favourite" },
  { key: "assignedTo", header: "Assigned To" },
  { key: "notes", header: "Notes" },
] as const;

export type ExportRow = Record<(typeof EXPORT_COLUMNS)[number]["key"], string>;

export function buildExportRows(leads: LeadDTO[]): ExportRow[] {
  return leads.map((lead) => ({
    name: lead.name,
    category: lead.category.join("; "),
    address: lead.address ?? "",
    phone: lead.phone ?? "",
    website: lead.website ?? "",
    rating: lead.rating != null ? String(lead.rating) : "",
    reviewCount: lead.reviewCount != null ? String(lead.reviewCount) : "",
    businessStatus: lead.businessStatus ?? "",
    lat: lead.lat != null ? String(lead.lat) : "",
    lng: lead.lng != null ? String(lead.lng) : "",
    emails: lead.emails.join("; "),
    emailVerified: lead.emailVerified ?? "",
    facebook: lead.socialLinks.facebook ?? "",
    instagram: lead.socialLinks.instagram ?? "",
    linkedin: lead.socialLinks.linkedin ?? "",
    twitter: lead.socialLinks.twitter ?? "",
    youtube: lead.socialLinks.youtube ?? "",
    tiktok: lead.socialLinks.tiktok ?? "",
    whatsapp: lead.socialLinks.whatsapp ?? "",
    pinterest: lead.socialLinks.pinterest ?? "",
    telegram: lead.socialLinks.telegram ?? "",
    threads: lead.socialLinks.threads ?? "",
    snapchat: lead.socialLinks.snapchat ?? "",
    discord: lead.socialLinks.discord ?? "",
    bookingLink: lead.bookingLink ?? "",
    menuLink: lead.menuLink ?? "",
    sslValid: lead.sslValid == null ? "" : lead.sslValid ? "yes" : "no",
    businessSizeEstimate: lead.businessSizeEstimate ?? "",
    placeId: lead.placeId,
    createdAt: lead.createdAt.slice(0, 10),
    status: lead.status,
    tags: lead.tags.join("; "),
    favourite: lead.favourite ? "yes" : "no",
    assignedTo: lead.assignedTo ?? "",
    notes: lead.notes ?? "",
  }));
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: ExportRow[]): string {
  const header = EXPORT_COLUMNS.map((c) => csvEscape(c.header)).join(",");
  const lines = rows.map((row) =>
    EXPORT_COLUMNS.map((c) => csvEscape(row[c.key] ?? "")).join(",")
  );
  return [header, ...lines].join("\r\n");
}

export async function rowsToXlsxBuffer(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");

  sheet.columns = EXPORT_COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: 22,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) sheet.addRow(row);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function slugifyForFilename(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "leads"
  );
}
