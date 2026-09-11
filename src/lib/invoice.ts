import { lineAmounts, invoiceTotals } from "./vat";
import { referenceForAccount, sellerUsesSampleIban } from "./qr";
import type { CreateInvoiceInput, InvoiceLine, InvoiceRecord } from "./types";
import type { SellerSettings } from "./types";

function lineDescription(
  grouping: CreateInvoiceInput["grouping"],
  entry: CreateInvoiceInput["entries"][number],
): string {
  const title = [entry.project, entry.task].filter(Boolean).join(" · ");
  if (grouping === "task") {
    return title || entry.client || "Arbeitszeit";
  }
  const date = formatDeDate(entry.date);
  const bits = [date, title, entry.notes].filter(Boolean);
  return bits.join(" — ") || "Arbeitszeit";
}

export function formatDeDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildInvoiceLines(
  input: CreateInvoiceInput,
): InvoiceLine[] {
  if (input.grouping === "entry") {
    return input.entries.map((entry) => {
      const amounts = lineAmounts(entry.hours, entry.billableRate, entry.vatRate);
      return {
        id: crypto.randomUUID(),
        description: lineDescription("entry", entry),
        hours: entry.hours,
        unitPrice: entry.billableRate,
        vatRate: entry.vatRate,
        ...amounts,
      };
    });
  }

  const groups = new Map<string, CreateInvoiceInput["entries"]>();
  for (const entry of input.entries) {
    const key = [
      entry.project,
      entry.task,
      entry.billableRate,
      entry.vatRate,
    ].join("|");
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }

  return [...groups.values()].map((group) => {
    const first = group[0];
    const hours = group.reduce((sum, e) => sum + e.hours, 0);
    const amounts = lineAmounts(hours, first.billableRate, first.vatRate);
    const notes = [...new Set(group.map((e) => e.notes).filter(Boolean))];
    const base = lineDescription("task", first);
    return {
      id: crypto.randomUUID(),
      description: notes.length === 1 ? `${base} — ${notes[0]}` : base,
      hours,
      unitPrice: first.billableRate,
      vatRate: first.vatRate,
      ...amounts,
    };
  });
}

export function assembleInvoice(
  input: CreateInvoiceInput,
  settings: SellerSettings,
  number: string,
): InvoiceRecord {
  if (!input.clientName.trim()) {
    throw new Error("Kundenname fehlt.");
  }
  if (input.entries.length === 0) {
    throw new Error("Keine Zeiten ausgewählt.");
  }

  const lines = buildInvoiceLines(input);
  const totals = invoiceTotals(lines);
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    number,
    status: "ready",
    clientName: input.clientName.trim(),
    clientAddress: input.clientAddress.trim(),
    clientBuilding: input.clientBuilding.trim(),
    clientZip: input.clientZip.trim(),
    clientCity: input.clientCity.trim(),
    clientCountry: (input.clientCountry.trim() || "CH").toUpperCase(),
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    currency: "CHF",
    notes: input.notes.trim(),
    netTotal: totals.net,
    vatTotal: totals.vat,
    grossTotal: totals.gross,
    reference: referenceForAccount(settings.iban, number),
    usingSampleCreditor: sellerUsesSampleIban(settings.iban),
    createdAt: now,
    updatedAt: now,
    lines,
  };
}
