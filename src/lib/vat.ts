import { roundToRappen } from "./money";

export const VAT_RATES = {
  normal: 8.1,
  reduced: 2.6,
  exempt: 0,
} as const;

export type VatCode = keyof typeof VAT_RATES;

export const VAT_LABELS: Record<VatCode, string> = {
  normal: "Normalsatz 8.1%",
  reduced: "Reduziert 2.6%",
  exempt: "Befreit 0%",
};

export function vatCodeFromRate(rate: number): VatCode {
  if (rate === VAT_RATES.reduced) return "reduced";
  if (rate === VAT_RATES.exempt) return "exempt";
  return "normal";
}

export interface LineAmounts {
  net: number;
  vat: number;
  gross: number;
}

/** Netto = Stunden × Ansatz, MwSt auf Netto, alles auf 5 Rappen. */
export function lineAmounts(
  hours: number,
  unitPrice: number,
  vatRatePercent: number,
): LineAmounts {
  const net = roundToRappen(hours * unitPrice);
  const vat = roundToRappen(net * (vatRatePercent / 100));
  const gross = roundToRappen(net + vat);
  return { net, vat, gross };
}

export interface VatBucket {
  rate: number;
  net: number;
  vat: number;
}

export interface InvoiceTotals {
  net: number;
  vat: number;
  gross: number;
  buckets: VatBucket[];
}

export function invoiceTotals(
  lines: Array<{ net: number; vat: number; vatRate: number }>,
): InvoiceTotals {
  const byRate = new Map<number, VatBucket>();
  for (const line of lines) {
    const existing = byRate.get(line.vatRate) ?? {
      rate: line.vatRate,
      net: 0,
      vat: 0,
    };
    existing.net = roundToRappen(existing.net + line.net);
    existing.vat = roundToRappen(existing.vat + line.vat);
    byRate.set(line.vatRate, existing);
  }

  const buckets = [...byRate.values()].sort((a, b) => b.rate - a.rate);
  const net = roundToRappen(buckets.reduce((sum, b) => sum + b.net, 0));
  const vat = roundToRappen(buckets.reduce((sum, b) => sum + b.vat, 0));
  const gross = roundToRappen(net + vat);
  return { net, vat, gross, buckets };
}
