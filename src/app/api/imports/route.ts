import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { fail, withUser } from "@/lib/api";
import { parseHarvestCsv } from "@/lib/csv";
import { getSettings, listEntries, saveImport } from "@/lib/db";

export async function GET() {
  const user = await withUser();
  if (user instanceof NextResponse) return user;
  const entries = await listEntries();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const user = await withUser();
  if (user instanceof NextResponse) return user;

  const contentType = request.headers.get("content-type") ?? "";
  const settings = await getSettings();
  let text = "";
  let filename = "upload.csv";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { demo?: boolean };
    if (!body.demo) return fail("Kein CSV übergeben.");
    const demoPath = path.join(process.cwd(), "data", "demo-harvest.csv");
    text = await readFile(demoPath, "utf8");
    filename = "demo-harvest.csv";
  } else {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Bitte eine CSV-Datei wählen.");
    filename = file.name || filename;
    text = await file.text();
  }

  try {
    const parsed = parseHarvestCsv(text, settings.defaultHourlyRate);
    const saved = await saveImport(filename, parsed.format, parsed.entries);
    return NextResponse.json({
      importId: saved.importId,
      entries: saved.entries,
      warnings: parsed.warnings,
      detectedColumns: parsed.detectedColumns,
      format: parsed.format,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "CSV konnte nicht gelesen werden.");
  }
}
