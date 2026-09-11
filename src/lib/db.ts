import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client, type InValue } from "@libsql/client";
import { SAMPLE_QR_IBAN } from "./qr";
import type { InvoiceLine, InvoiceRecord, SellerSettings } from "./types";
import type { TimeEntry } from "./csv";

const DEFAULT_SETTINGS: SellerSettings = {
  name: "Joel Baumann",
  address: "In den Klosterreben",
  buildingNumber: "48",
  zip: "4052",
  city: "Basel",
  country: "CH",
  email: "shopnordcart@gmail.com",
  phone: "",
  vatNumber: "",
  iban: SAMPLE_QR_IBAN,
  defaultHourlyRate: 160,
  defaultVatRate: 8.1,
  paymentDays: 30,
  invoicePrefix: "RE",
  nextInvoiceNumber: 1,
};

let client: Client | null = null;
let initialized = false;

function dbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "flatqr.db")}`;
}

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: dbUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function initDb(): Promise<Client> {
  const db = getDb();
  if (initialized) return db;

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      building_number TEXT NOT NULL,
      zip TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      vat_number TEXT NOT NULL DEFAULT '',
      iban TEXT NOT NULL,
      default_hourly_rate REAL NOT NULL,
      default_vat_rate REAL NOT NULL,
      payment_days INTEGER NOT NULL,
      invoice_prefix TEXT NOT NULL,
      next_invoice_number INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      format TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      import_id TEXT NOT NULL,
      date TEXT NOT NULL,
      client TEXT NOT NULL,
      project TEXT NOT NULL,
      project_code TEXT NOT NULL,
      task TEXT NOT NULL,
      notes TEXT NOT NULL,
      hours REAL NOT NULL,
      billable INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      billable_rate REAL NOT NULL,
      billable_amount REAL NOT NULL,
      currency TEXT NOT NULL,
      vat_rate REAL NOT NULL,
      selected INTEGER NOT NULL,
      FOREIGN KEY (import_id) REFERENCES imports(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_address TEXT NOT NULL,
      client_building TEXT NOT NULL,
      client_zip TEXT NOT NULL,
      client_city TEXT NOT NULL,
      client_country TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      currency TEXT NOT NULL,
      notes TEXT NOT NULL,
      net_total REAL NOT NULL,
      vat_total REAL NOT NULL,
      gross_total REAL NOT NULL,
      reference TEXT NOT NULL,
      using_sample_creditor INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoice_lines (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      description TEXT NOT NULL,
      hours REAL NOT NULL,
      unit_price REAL NOT NULL,
      vat_rate REAL NOT NULL,
      net REAL NOT NULL,
      vat REAL NOT NULL,
      gross REAL NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );
  `);

  const existing = await db.execute("SELECT id FROM settings WHERE id = 1");
  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO settings (
        id, name, address, building_number, zip, city, country, email, phone,
        vat_number, iban, default_hourly_rate, default_vat_rate, payment_days,
        invoice_prefix, next_invoice_number
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        DEFAULT_SETTINGS.name,
        DEFAULT_SETTINGS.address,
        DEFAULT_SETTINGS.buildingNumber,
        DEFAULT_SETTINGS.zip,
        DEFAULT_SETTINGS.city,
        DEFAULT_SETTINGS.country,
        DEFAULT_SETTINGS.email,
        DEFAULT_SETTINGS.phone,
        DEFAULT_SETTINGS.vatNumber,
        DEFAULT_SETTINGS.iban,
        DEFAULT_SETTINGS.defaultHourlyRate,
        DEFAULT_SETTINGS.defaultVatRate,
        DEFAULT_SETTINGS.paymentDays,
        DEFAULT_SETTINGS.invoicePrefix,
        DEFAULT_SETTINGS.nextInvoiceNumber,
      ],
    });
  }

  initialized = true;
  return db;
}

function rowStr(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? "");
}

function rowNum(row: Record<string, unknown>, key: string): number {
  return Number(row[key] ?? 0);
}

export async function getSettings(): Promise<SellerSettings> {
  const db = await initDb();
  const result = await db.execute("SELECT * FROM settings WHERE id = 1");
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    name: rowStr(row, "name"),
    address: rowStr(row, "address"),
    buildingNumber: rowStr(row, "building_number"),
    zip: rowStr(row, "zip"),
    city: rowStr(row, "city"),
    country: rowStr(row, "country"),
    email: rowStr(row, "email"),
    phone: rowStr(row, "phone"),
    vatNumber: rowStr(row, "vat_number"),
    iban: rowStr(row, "iban"),
    defaultHourlyRate: rowNum(row, "default_hourly_rate"),
    defaultVatRate: rowNum(row, "default_vat_rate"),
    paymentDays: rowNum(row, "payment_days"),
    invoicePrefix: rowStr(row, "invoice_prefix"),
    nextInvoiceNumber: rowNum(row, "next_invoice_number"),
  };
}

export async function saveSettings(settings: SellerSettings): Promise<void> {
  const db = await initDb();
  await db.execute({
    sql: `UPDATE settings SET
      name = ?, address = ?, building_number = ?, zip = ?, city = ?, country = ?,
      email = ?, phone = ?, vat_number = ?, iban = ?, default_hourly_rate = ?,
      default_vat_rate = ?, payment_days = ?, invoice_prefix = ?, next_invoice_number = ?
      WHERE id = 1`,
    args: [
      settings.name,
      settings.address,
      settings.buildingNumber,
      settings.zip,
      settings.city,
      settings.country,
      settings.email,
      settings.phone,
      settings.vatNumber,
      settings.iban,
      settings.defaultHourlyRate,
      settings.defaultVatRate,
      settings.paymentDays,
      settings.invoicePrefix,
      settings.nextInvoiceNumber,
    ],
  });
}

export async function createSession(email: string): Promise<string> {
  const db = await initDb();
  const token = crypto.randomUUID() + crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await db.execute({
    sql: "INSERT INTO sessions (token, email, created_at, expires_at) VALUES (?, ?, ?, ?)",
    args: [token, email, now.toISOString(), expires.toISOString()],
  });
  return token;
}

export async function getSessionEmail(token: string): Promise<string | null> {
  const db = await initDb();
  const result = await db.execute({
    sql: "SELECT email, expires_at FROM sessions WHERE token = ?",
    args: [token],
  });
  const row = result.rows[0] as unknown as
    | { email: string; expires_at: string }
    | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
    return null;
  }
  return row.email;
}

export async function deleteSession(token: string): Promise<void> {
  const db = await initDb();
  await db.execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
}

export async function saveImport(
  filename: string,
  format: string,
  entries: TimeEntry[],
): Promise<{ importId: string; entries: TimeEntry[] }> {
  const db = await initDb();
  const importId = crypto.randomUUID();
  await db.execute({
    sql: "INSERT INTO imports (id, filename, format, created_at) VALUES (?, ?, ?, ?)",
    args: [importId, filename, format, new Date().toISOString()],
  });

  if (entries.length > 0) {
    const placeholders = entries
      .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .join(", ");
    const args: InValue[] = [];
    for (const entry of entries) {
      args.push(
        entry.id,
        importId,
        entry.date,
        entry.client,
        entry.project,
        entry.projectCode,
        entry.task,
        entry.notes,
        entry.hours,
        entry.billable ? 1 : 0,
        entry.firstName,
        entry.lastName,
        entry.billableRate,
        entry.billableAmount,
        entry.currency,
        entry.vatRate,
        entry.selected ? 1 : 0,
      );
    }
    await db.execute({
      sql: `INSERT INTO time_entries (
        id, import_id, date, client, project, project_code, task, notes, hours,
        billable, first_name, last_name, billable_rate, billable_amount, currency,
        vat_rate, selected
      ) VALUES ${placeholders}`,
      args,
    });
  }

  return { importId, entries };
}

function entryFromRow(row: Record<string, unknown>): TimeEntry {
  return {
    id: rowStr(row, "id"),
    date: rowStr(row, "date"),
    client: rowStr(row, "client"),
    project: rowStr(row, "project"),
    projectCode: rowStr(row, "project_code"),
    task: rowStr(row, "task"),
    notes: rowStr(row, "notes"),
    hours: rowNum(row, "hours"),
    billable: rowNum(row, "billable") === 1,
    firstName: rowStr(row, "first_name"),
    lastName: rowStr(row, "last_name"),
    billableRate: rowNum(row, "billable_rate"),
    billableAmount: rowNum(row, "billable_amount"),
    currency: rowStr(row, "currency"),
    vatRate: rowNum(row, "vat_rate"),
    selected: rowNum(row, "selected") === 1,
  };
}

export async function listEntries(importId?: string): Promise<TimeEntry[]> {
  const db = await initDb();
  const result = importId
    ? await db.execute({
        sql: "SELECT * FROM time_entries WHERE import_id = ? ORDER BY date, client, project",
        args: [importId],
      })
    : await db.execute(
        `SELECT * FROM time_entries WHERE import_id = (
           SELECT id FROM imports ORDER BY created_at DESC LIMIT 1
         ) ORDER BY date, client, project`,
      );
  return result.rows.map((row) => entryFromRow(row as Record<string, unknown>));
}

export async function updateEntries(
  updates: Array<
    Pick<TimeEntry, "id" | "hours" | "billableRate" | "vatRate" | "selected" | "notes" | "task" | "project" | "client">
  >,
): Promise<void> {
  const db = await initDb();
  for (const update of updates) {
    await db.execute({
      sql: `UPDATE time_entries SET
        hours = ?, billable_rate = ?, vat_rate = ?, selected = ?, notes = ?,
        task = ?, project = ?, client = ?, billable_amount = ?
        WHERE id = ?`,
      args: [
        update.hours,
        update.billableRate,
        update.vatRate,
        update.selected ? 1 : 0,
        update.notes,
        update.task,
        update.project,
        update.client,
        update.hours * update.billableRate,
        update.id,
      ],
    });
  }
}

function lineFromRow(row: Record<string, unknown>): InvoiceLine {
  return {
    id: rowStr(row, "id"),
    description: rowStr(row, "description"),
    hours: rowNum(row, "hours"),
    unitPrice: rowNum(row, "unit_price"),
    vatRate: rowNum(row, "vat_rate"),
    net: rowNum(row, "net"),
    vat: rowNum(row, "vat"),
    gross: rowNum(row, "gross"),
  };
}

function invoiceFromRow(
  row: Record<string, unknown>,
  lines: InvoiceLine[],
): InvoiceRecord {
  return {
    id: rowStr(row, "id"),
    number: rowStr(row, "number"),
    status: rowStr(row, "status") as InvoiceRecord["status"],
    clientName: rowStr(row, "client_name"),
    clientAddress: rowStr(row, "client_address"),
    clientBuilding: rowStr(row, "client_building"),
    clientZip: rowStr(row, "client_zip"),
    clientCity: rowStr(row, "client_city"),
    clientCountry: rowStr(row, "client_country"),
    issueDate: rowStr(row, "issue_date"),
    dueDate: rowStr(row, "due_date"),
    currency: "CHF",
    notes: rowStr(row, "notes"),
    netTotal: rowNum(row, "net_total"),
    vatTotal: rowNum(row, "vat_total"),
    grossTotal: rowNum(row, "gross_total"),
    reference: rowStr(row, "reference"),
    usingSampleCreditor: rowNum(row, "using_sample_creditor") === 1,
    createdAt: rowStr(row, "created_at"),
    updatedAt: rowStr(row, "updated_at"),
    lines,
  };
}

export async function peekNextInvoiceNumber(): Promise<string> {
  const settings = await getSettings();
  const year = new Date().getFullYear();
  return `${settings.invoicePrefix}-${year}-${String(settings.nextInvoiceNumber).padStart(4, "0")}`;
}

export async function takeInvoiceNumber(): Promise<string> {
  const settings = await getSettings();
  const year = new Date().getFullYear();
  const number = `${settings.invoicePrefix}-${year}-${String(settings.nextInvoiceNumber).padStart(4, "0")}`;
  await saveSettings({
    ...settings,
    nextInvoiceNumber: settings.nextInvoiceNumber + 1,
  });
  return number;
}

export async function saveInvoice(invoice: InvoiceRecord): Promise<void> {
  const db = await initDb();
  await db.execute({
    sql: `INSERT INTO invoices (
      id, number, status, client_name, client_address, client_building, client_zip,
      client_city, client_country, issue_date, due_date, currency, notes,
      net_total, vat_total, gross_total, reference, using_sample_creditor,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      invoice.id,
      invoice.number,
      invoice.status,
      invoice.clientName,
      invoice.clientAddress,
      invoice.clientBuilding,
      invoice.clientZip,
      invoice.clientCity,
      invoice.clientCountry,
      invoice.issueDate,
      invoice.dueDate,
      invoice.currency,
      invoice.notes,
      invoice.netTotal,
      invoice.vatTotal,
      invoice.grossTotal,
      invoice.reference,
      invoice.usingSampleCreditor ? 1 : 0,
      invoice.createdAt,
      invoice.updatedAt,
    ],
  });

  for (const [index, line] of invoice.lines.entries()) {
    await db.execute({
      sql: `INSERT INTO invoice_lines (
        id, invoice_id, description, hours, unit_price, vat_rate, net, vat, gross, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        line.id,
        invoice.id,
        line.description,
        line.hours,
        line.unitPrice,
        line.vatRate,
        line.net,
        line.vat,
        line.gross,
        index,
      ],
    });
  }
}

export async function getInvoice(id: string): Promise<InvoiceRecord | null> {
  const db = await initDb();
  const result = await db.execute({
    sql: "SELECT * FROM invoices WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const lines = await db.execute({
    sql: "SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY sort_order",
    args: [id],
  });
  return invoiceFromRow(
    row,
    lines.rows.map((line) => lineFromRow(line as Record<string, unknown>)),
  );
}

export async function listInvoices(): Promise<InvoiceRecord[]> {
  const db = await initDb();
  const result = await db.execute(
    "SELECT * FROM invoices ORDER BY created_at DESC",
  );
  const invoices: InvoiceRecord[] = [];
  for (const row of result.rows) {
    const id = String((row as Record<string, unknown>).id);
    const lines = await db.execute({
      sql: "SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY sort_order",
      args: [id],
    });
    invoices.push(
      invoiceFromRow(
        row as Record<string, unknown>,
        lines.rows.map((line) => lineFromRow(line as Record<string, unknown>)),
      ),
    );
  }
  return invoices;
}
