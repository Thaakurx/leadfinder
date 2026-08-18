import { NextResponse } from "next/server";
import Papa from "papaparse";
import ExcelJS from "exceljs";

const MAX_PREVIEW_ROWS = 5000;

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const isXlsx = /\.xlsx?m?$/i.test(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  let headers: string[] = [];
  let rows: Record<string, string>[] = [];

  try {
    if (isXlsx) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) {
        return NextResponse.json(
          { error: "No worksheet found in file" },
          { status: 400 }
        );
      }
      const headerValues = sheet.getRow(1).values as unknown[];
      headers = headerValues.slice(1).map((v) => String(v ?? "").trim());

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = row.values as unknown[];
        const record: Record<string, string> = {};
        headers.forEach((h, i) => {
          const cell = values[i + 1];
          record[h] = cell != null ? String(cell) : "";
        });
        rows.push(record);
      });
    } else {
      const text = buffer.toString("utf-8");
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      headers = parsed.meta.fields ?? [];
      rows = parsed.data;
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to parse file: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      },
      { status: 400 }
    );
  }

  const truncated = rows.length > MAX_PREVIEW_ROWS;
  if (truncated) rows = rows.slice(0, MAX_PREVIEW_ROWS);

  return NextResponse.json({ headers, rows, truncated });
}
