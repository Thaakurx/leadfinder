import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeLead } from "@/lib/serializers";
import { buildLeadsOrderBy, buildLeadsWhere } from "@/lib/leads-query";
import { leadsExportQuerySchema } from "@/lib/validation";
import {
  buildExportRows,
  rowsToCsv,
  rowsToXlsxBuffer,
  slugifyForFilename,
} from "@/lib/export";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const idsParam = searchParams.get("ids");

  let leads;
  let filenameTerm = "leads";

  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    const rows = await prisma.lead.findMany({ where: { id: { in: ids } } });
    leads = rows.map(serializeLead);
  } else {
    const parsed = leadsExportQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const where = buildLeadsWhere(parsed.data);
    const orderBy = buildLeadsOrderBy(parsed.data);
    const rows = await prisma.lead.findMany({ where, orderBy });
    leads = rows.map(serializeLead);

    if (parsed.data.searchId) {
      const search = await prisma.search.findUnique({
        where: { id: parsed.data.searchId },
      });
      if (search) filenameTerm = search.keyword;
    } else if (parsed.data.search) {
      filenameTerm = parsed.data.search;
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `leadfinder-${slugifyForFilename(filenameTerm)}-${dateStr}.${format}`;
  const exportRows = buildExportRows(leads);

  if (format === "xlsx") {
    const buffer = await rowsToXlsxBuffer(exportRows);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const csv = rowsToCsv(exportRows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
