import { describe, expect, it } from "vitest";
import { invoiceTotals, lineAmounts } from "./vat";
import { parseDecimal, roundToRappen } from "./money";

describe("MwSt and Swiss rounding", () => {
  it("applies 8.1% on a clean net", () => {
    const line = lineAmounts(10, 100, 8.1);
    expect(line.net).toBe(1000);
    expect(line.vat).toBe(81);
    expect(line.gross).toBe(1081);
  });

  it("applies 2.6% reduced rate", () => {
    const line = lineAmounts(3, 120, 2.6);
    expect(line.net).toBe(360);
    expect(line.vat).toBe(9.35);
    expect(line.gross).toBe(369.35);
  });

  it("keeps exempt lines at 0% VAT", () => {
    const line = lineAmounts(2, 80, 0);
    expect(line.vat).toBe(0);
    expect(line.gross).toBe(160);
  });

  it("rounds commercial amounts to 5 rappen", () => {
    expect(roundToRappen(1.02)).toBe(1.0);
    expect(roundToRappen(1.03)).toBe(1.05);
    expect(roundToRappen(10.125)).toBe(10.15);
  });

  it("groups mixed VAT rates without double rounding surprises", () => {
    const a = lineAmounts(1, 1000, 8.1);
    const b = lineAmounts(1, 360, 2.6);
    const totals = invoiceTotals([
      { ...a, vatRate: 8.1 },
      { ...b, vatRate: 2.6 },
    ]);
    expect(totals.buckets).toHaveLength(2);
    expect(totals.net).toBe(1360);
    expect(totals.vat).toBe(90.35);
    expect(totals.gross).toBe(1450.35);
  });

  it("parses Harvest and Swiss decimal formats", () => {
    expect(parseDecimal("6,5")).toBe(6.5);
    expect(parseDecimal("1'040.00")).toBe(1040);
    expect(parseDecimal("1.040,50")).toBe(1040.5);
  });
});
