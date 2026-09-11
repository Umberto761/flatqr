import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseHarvestCsv } from "./csv";
import { assembleInvoice } from "./invoice";
import { renderInvoicePdf } from "./pdf";
import { SAMPLE_QR_IBAN } from "./qr";
import type { SellerSettings } from "./types";

const settings: SellerSettings = {
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

describe("Swiss QR PDF", () => {
  it("builds a valid PDF from the demo CSV", async () => {
    const csv = readFileSync(path.join(process.cwd(), "data/demo-harvest.csv"), "utf8");
    const parsed = parseHarvestCsv(csv);
    const selected = parsed.entries.filter((entry) => entry.selected);
    const invoice = assembleInvoice(
      {
        clientName: "Atelier Nord GmbH",
        clientAddress: "Clarastrasse",
        clientBuilding: "12",
        clientZip: "4058",
        clientCity: "Basel",
        clientCountry: "CH",
        issueDate: "2026-09-01",
        dueDate: "2026-10-01",
        notes: "Zahlbar innert 30 Tagen netto.",
        grouping: "task",
        entries: selected,
      },
      settings,
      "RE-2026-0001",
    );

    expect(invoice.usingSampleCreditor).toBe(true);
    expect(invoice.grossTotal).toBeGreaterThan(0);
    expect(invoice.reference).toHaveLength(27);

    const pdf = await renderInvoicePdf(invoice, settings);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(4000);

    const dir = mkdtempSync(path.join(tmpdir(), "flatqr-"));
    const file = path.join(dir, "RE-2026-0001.pdf");
    writeFileSync(file, pdf);
  });
});
