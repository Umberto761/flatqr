import Papa from "papaparse";
import { parseDecimal } from "./money";
import { VAT_RATES } from "./vat";

export interface TimeEntry {
  id: string;
  date: string;
  client: string;
  project: string;
  projectCode: string;
  task: string;
  notes: string;
  hours: number;
  billable: boolean;
  firstName: string;
  lastName: string;
  billableRate: number;
  billableAmount: number;
  currency: string;
  vatRate: number;
  selected: boolean;
}

export interface ParseWarning {
  row: number;
  message: string;
}

export interface ParseResult {
  entries: TimeEntry[];
  warnings: ParseWarning[];
  detectedColumns: string[];
  format: string;
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: [
    "date",
    "datum",
    "spent date",
    "spent_date",
    "day",
    "tag",
  ],
  client: ["client", "kunde", "client name", "client_name", "kundenname"],
  project: ["project", "projekt", "project name", "project_name", "projektname"],
  projectCode: [
    "project code",
    "project_code",
    "projektcode",
    "projekt-code",
    "code",
  ],
  task: ["task", "aufgabe", "task name", "task_name", "taetigkeit", "tätigkeit"],
  notes: [
    "notes",
    "note",
    "notizen",
    "bemerkungen",
    "bemerkung",
    "description",
    "beschreibung",
    "kommentar",
  ],
  hours: [
    "hours",
    "stunden",
    "hours rounded",
    "hours_rounded",
    "stunden (gerundet)",
    "quantity",
    "menge",
    "zeit",
  ],
  billable: ["billable?", "billable", "abrechenbar?", "abrechenbar", "billable?"],
  firstName: ["first name", "first_name", "vorname"],
  lastName: ["last name", "last_name", "nachname", "name"],
  billableRate: [
    "billable rate",
    "billable_rate",
    "rate",
    "stundensatz",
    "abrechenbarer satz",
    "hourly rate",
    "hourly_rate",
  ],
  billableAmount: [
    "billable amount",
    "billable_amount",
    "amount",
    "betrag",
    "abrechenbarer betrag",
  ],
  currency: ["currency", "währung", "waehrung"],
};

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function mapHeaders(headers: string[]): {
  map: Record<string, string>;
  unknown: string[];
} {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  const unknown: string[] = [];

  for (const raw of headers) {
    const key = normalizeHeader(raw);
    let matched: string | null = null;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (used.has(field)) continue;
      if (aliases.includes(key)) {
        matched = field;
        break;
      }
    }
    if (matched) {
      map[matched] = raw;
      used.add(matched);
    } else if (key) {
      unknown.push(raw);
    }
  }

  return { map, unknown };
}

function parseBool(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  return ["yes", "y", "true", "1", "ja", "wahr", "x"].includes(v);
}

function parseDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(v);
  if (de) {
    return `${de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`;
  }

  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (us) {
    const a = Number(us[1]);
    const b = Number(us[2]);
    // Harvest US default is M/D/YYYY; if first part > 12 it must be D/M/YYYY
    if (a > 12) {
      return `${us[3]}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
    return `${us[3]}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
  }

  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function cell(
  row: Record<string, string>,
  map: Record<string, string>,
  field: string,
): string {
  const header = map[field];
  if (!header) return "";
  return String(row[header] ?? "").trim();
}

function detectFormat(mapped: Record<string, string>): string {
  if (mapped.billableRate && mapped.billableAmount && mapped.project) {
    return "Harvest Detailed Time Report / Export all time";
  }
  if (mapped.client && mapped.project && mapped.task && mapped.hours) {
    return "Harvest Time Report / Import-CSV";
  }
  return "Freies CSV (gemappte Spalten)";
}

function detectDelimiter(text: string): string {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export function parseHarvestCsv(text: string, defaultRate = 160): ParseResult {
  const delimiter = detectDelimiter(text);

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
  });

  const headers = parsed.meta.fields?.filter(Boolean) ?? [];
  if (headers.length === 0) {
    throw new Error(
      "Keine Kopfzeile gefunden. Erwartet wird ein Harvest-CSV mit Spalten wie Date, Client, Project, Task, Hours.",
    );
  }

  const { map } = mapHeaders(headers);
  if (!map.date) {
    throw new Error(
      `Spalte für das Datum fehlt. Gefunden: ${headers.join(", ")}. Erwartet u. a. Date / Datum.`,
    );
  }
  if (!map.hours) {
    throw new Error(
      `Spalte für Stunden fehlt. Gefunden: ${headers.join(", ")}. Erwartet u. a. Hours / Stunden.`,
    );
  }

  const warnings: ParseWarning[] = [];
  const entries: TimeEntry[] = [];

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2;
    const dateRaw = cell(row, map, "date");
    const hoursRaw = cell(row, map, "hours");
    if (!dateRaw && !hoursRaw) return;

    const date = parseDate(dateRaw);
    if (!date) {
      warnings.push({
        row: rowNumber,
        message: `Datum unlesbar: «${dateRaw}»`,
      });
      return;
    }

    const hours = parseDecimal(hoursRaw);
    if (hours <= 0) {
      warnings.push({
        row: rowNumber,
        message: `Stunden ≤ 0 übersprungen (${hoursRaw || "leer"})`,
      });
      return;
    }

    const rateRaw = cell(row, map, "billableRate");
    const amountRaw = cell(row, map, "billableAmount");
    const rate = rateRaw ? parseDecimal(rateRaw) : 0;
    const amount = amountRaw ? parseDecimal(amountRaw) : 0;
    const billableRate =
      rate > 0 ? rate : amount > 0 ? roundRate(amount / hours) : defaultRate;
    const billableAmount = amount > 0 ? amount : hours * billableRate;
    const billable = map.billable ? parseBool(cell(row, map, "billable")) : true;

    entries.push({
      id: crypto.randomUUID(),
      date,
      client: cell(row, map, "client"),
      project: cell(row, map, "project"),
      projectCode: cell(row, map, "projectCode"),
      task: cell(row, map, "task"),
      notes: cell(row, map, "notes"),
      hours,
      billable,
      firstName: cell(row, map, "firstName"),
      lastName: cell(row, map, "lastName"),
      billableRate,
      billableAmount,
      currency: cell(row, map, "currency") || "CHF",
      vatRate: VAT_RATES.normal,
      selected: billable,
    });
  });

  if (entries.length === 0) {
    throw new Error(
      "Keine Zeit-Zeilen gelesen. Prüfe, ob Date/Datum und Hours/Stunden gefüllt sind.",
    );
  }

  return {
    entries,
    warnings,
    detectedColumns: headers,
    format: detectFormat(map),
  };
}

function roundRate(value: number): number {
  return Math.round(value * 100) / 100;
}

export const EXPECTED_COLUMNS = [
  {
    name: "Date / Datum",
    required: true,
    note: "YYYY-MM-DD, DD.MM.YYYY oder M/D/YYYY",
  },
  {
    name: "Hours / Stunden",
    required: true,
    note: "Dezimal, auch 6,5 oder 6.5",
  },
  { name: "Client / Kunde", required: false, note: "wird zur Gruppierung genutzt" },
  { name: "Project / Projekt", required: false, note: "erscheint auf der Rechnung" },
  { name: "Task / Aufgabe", required: false, note: "erscheint in der Bezeichnung" },
  { name: "Notes / Notizen", required: false, note: "optionaler Zusatztext" },
  {
    name: "Billable Rate / Stundensatz",
    required: false,
    note: "sonst Default aus den Einstellungen",
  },
  {
    name: "Billable Amount / Betrag",
    required: false,
    note: "falls Satz fehlt, Betrag ÷ Stunden",
  },
  {
    name: "Billable? / Abrechenbar?",
    required: false,
    note: "nicht abrechenbare Zeilen sind abgewählt",
  },
] as const;
