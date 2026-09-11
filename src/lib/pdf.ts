import { PassThrough } from "node:stream";
import PDFDocument from "pdfkit";
import { SwissQRBill, Table } from "swissqrbill/pdf";
import type { Data } from "swissqrbill/types";
import { formatAmount, formatIBAN, mm2pt } from "swissqrbill/utils";
import { formatDeDate } from "./invoice";
import { formatCHF } from "./money";
import { compactIban } from "./qr";
import type { InvoiceRecord, SellerSettings } from "./types";
import { invoiceTotals } from "./vat";

function streetLine(address: string, building: string): string {
  return [address, building].filter(Boolean).join(" ").trim();
}

function toQrData(invoice: InvoiceRecord, settings: SellerSettings): Data {
  const data: Data = {
    amount: invoice.grossTotal,
    currency: "CHF",
    creditor: {
      account: compactIban(settings.iban),
      name: settings.name.slice(0, 70),
      address: settings.address.slice(0, 70),
      buildingNumber: settings.buildingNumber || undefined,
      zip: settings.zip,
      city: settings.city,
      country: settings.country || "CH",
    },
    debtor: {
      name: invoice.clientName.slice(0, 70),
      address: invoice.clientAddress.slice(0, 70),
      buildingNumber: invoice.clientBuilding || undefined,
      zip: invoice.clientZip,
      city: invoice.clientCity,
      country: invoice.clientCountry || "CH",
    },
    reference: invoice.reference,
    message: `Rechnung ${invoice.number}`.slice(0, 140),
  };
  return data;
}

export async function renderInvoicePdf(
  invoice: InvoiceRecord,
  settings: SellerSettings,
): Promise<Buffer> {
  const data = toQrData(invoice, settings);
  const totals = invoiceTotals(
    invoice.lines.map((line) => ({
      net: line.net,
      vat: line.vat,
      vatRate: line.vatRate,
    })),
  );

  const pdf = new PDFDocument({ size: "A4", margin: 0 });
  const chunks: Buffer[] = [];
  const stream = new PassThrough();
  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    pdf.on("error", reject);
  });
  pdf.pipe(stream);

  const ink = "#0D1B2A";
  const muted = "#5C6770";
  const paperLine = "#C5C9D0";

  pdf.fillColor(ink);
  pdf.font("Helvetica-Bold").fontSize(18);
  pdf.text("Rechnung", mm2pt(20), mm2pt(16), { width: mm2pt(100) });

  pdf.font("Helvetica").fontSize(8).fillColor(muted);
  pdf.text("Swiss QR-Rechnung  ·  FlatQR", mm2pt(20), mm2pt(24), {
    width: mm2pt(100),
  });

  if (invoice.usingSampleCreditor) {
    pdf.rect(mm2pt(20), mm2pt(30), mm2pt(170), mm2pt(10)).fill("#F4E6E4");
    pdf.fillColor("#8A1C14").font("Helvetica-Bold").fontSize(8);
    pdf.text(
      "Muster-Gläubigerdaten: SIX-Beispiel-QR-IBAN. Vor dem Versand unter Einstellungen die echte IBAN eintragen.",
      mm2pt(22),
      mm2pt(33),
      { width: mm2pt(166) },
    );
  }

  const top = invoice.usingSampleCreditor ? 44 : 34;

  pdf.fillColor(ink).font("Helvetica-Bold").fontSize(9);
  pdf.text("Gläubiger", mm2pt(20), mm2pt(top), { width: mm2pt(80) });
  pdf.font("Helvetica").fontSize(10);
  pdf.text(
    [
      settings.name,
      streetLine(settings.address, settings.buildingNumber),
      `${settings.zip} ${settings.city}`,
      settings.country,
      settings.email,
      settings.vatNumber ? `MWST-Nr. ${settings.vatNumber}` : "",
      `IBAN ${formatIBAN(compactIban(settings.iban))}`,
    ]
      .filter(Boolean)
      .join("\n"),
    mm2pt(20),
    mm2pt(top + 5),
    { width: mm2pt(80), lineGap: 1.5 },
  );

  pdf.font("Helvetica-Bold").fontSize(9);
  pdf.text("Rechnungsempfänger", mm2pt(115), mm2pt(top), { width: mm2pt(75) });
  pdf.font("Helvetica").fontSize(10);
  pdf.text(
    [
      invoice.clientName,
      streetLine(invoice.clientAddress, invoice.clientBuilding),
      `${invoice.clientZip} ${invoice.clientCity}`,
      invoice.clientCountry,
    ]
      .filter(Boolean)
      .join("\n"),
    mm2pt(115),
    mm2pt(top + 5),
    { width: mm2pt(75), lineGap: 1.5 },
  );

  const metaY = top + 42;
  pdf.fontSize(9).fillColor(muted);
  pdf.text(`Rechnungsnummer`, mm2pt(20), mm2pt(metaY));
  pdf.text(`Datum`, mm2pt(70), mm2pt(metaY));
  pdf.text(`Zahlbar bis`, mm2pt(110), mm2pt(metaY));
  pdf.text(`Währung`, mm2pt(160), mm2pt(metaY));

  pdf.font("Helvetica-Bold").fontSize(10).fillColor(ink);
  pdf.text(invoice.number, mm2pt(20), mm2pt(metaY + 4.5));
  pdf.text(formatDeDate(invoice.issueDate), mm2pt(70), mm2pt(metaY + 4.5));
  pdf.text(formatDeDate(invoice.dueDate), mm2pt(110), mm2pt(metaY + 4.5));
  pdf.text(invoice.currency, mm2pt(160), mm2pt(metaY + 4.5));

  const rows: ConstructorParameters<typeof Table>[0]["rows"] = [
    {
      header: true,
      backgroundColor: ink,
      textColor: "#F2F3F5",
      fontName: "Helvetica-Bold",
      fontSize: 8,
      height: 18,
      padding: 4,
      verticalAlign: "center",
      columns: [
        { text: "Pos.", width: mm2pt(12) },
        { text: "Std.", width: mm2pt(16) },
        { text: "Bezeichnung" },
        { text: "Ansatz", width: mm2pt(28), align: "right" },
        { text: "MwSt", width: mm2pt(18), align: "right" },
        { text: "Betrag", width: mm2pt(28), align: "right" },
      ],
    },
  ];

  invoice.lines.forEach((line, index) => {
    rows.push({
      fontSize: 8,
      padding: 4,
      minHeight: 16,
      columns: [
        { text: String(index + 1), width: mm2pt(12) },
        { text: line.hours.toFixed(2), width: mm2pt(16) },
        { text: line.description },
        { text: formatAmount(line.unitPrice), width: mm2pt(28), align: "right" },
        { text: `${line.vatRate.toFixed(1)}%`, width: mm2pt(18), align: "right" },
        { text: formatAmount(line.net), width: mm2pt(28), align: "right" },
      ],
    });
  });

  rows.push({
    fontSize: 8,
    padding: 4,
    columns: [
      { text: "", width: mm2pt(12) },
      { text: "", width: mm2pt(16) },
      { text: "Zwischensumme (exkl. MwSt)" },
      { text: "", width: mm2pt(28) },
      { text: "", width: mm2pt(18) },
      { text: formatAmount(totals.net), width: mm2pt(28), align: "right" },
    ],
  });

  for (const bucket of totals.buckets) {
    rows.push({
      fontSize: 8,
      padding: 4,
      columns: [
        { text: "", width: mm2pt(12) },
        { text: "", width: mm2pt(16) },
        { text: `MwSt ${bucket.rate.toFixed(1)}% auf ${formatCHF(bucket.net)}` },
        { text: "", width: mm2pt(28) },
        { text: "", width: mm2pt(18) },
        { text: formatAmount(bucket.vat), width: mm2pt(28), align: "right" },
      ],
    });
  }

  rows.push({
    fontName: "Helvetica-Bold",
    fontSize: 9,
    padding: 5,
    height: 22,
    backgroundColor: "#E6E8EC",
    columns: [
      { text: "", width: mm2pt(12) },
      { text: "", width: mm2pt(16) },
      { text: "Total" },
      { text: "", width: mm2pt(28) },
      { text: "", width: mm2pt(18) },
      {
        text: formatCHF(totals.gross),
        width: mm2pt(28),
        align: "right",
      },
    ],
  });

  const table = new Table({
    width: mm2pt(170),
    borderColor: paperLine,
    borderWidth: 0.4,
    rows,
  });
  table.attachTo(pdf, mm2pt(20), mm2pt(metaY + 14));

  if (invoice.notes) {
    const y = Math.min(pdf.y + 8, mm2pt(175));
    pdf.font("Helvetica-Bold").fontSize(8).fillColor(ink);
    pdf.text("Bemerkung", mm2pt(20), y, { width: mm2pt(170) });
    pdf.font("Helvetica").fontSize(8).fillColor(muted);
    pdf.text(invoice.notes, mm2pt(20), y + 10, { width: mm2pt(170) });
  }

  const qrBill = new SwissQRBill(data, { language: "DE" });
  qrBill.attachTo(pdf);

  pdf.end();
  return done;
}
