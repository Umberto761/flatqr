/** Swiss commercial rounding to 5 rappen (0.05 CHF). */
export function roundToRappen(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 20) / 20;
}

export function roundCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

/** Parse Harvest / Excel numbers: 6.5, 6,5, 1'040.00, 1.040,50 */
export function parseDecimal(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (value == null) return 0;
  const raw = String(value).trim();
  if (!raw || raw === "-" || raw === "—") return 0;

  const cleaned = raw.replace(/\s/g, "").replace(/'/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized = cleaned;
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    const fraction = cleaned.slice(lastComma + 1);
    if (fraction.length === 3 && !cleaned.slice(0, lastComma).includes(".")) {
      // 1,040 as thousands is uncommon in Harvest hours; treat as 1040
      normalized = cleaned.replace(",", "");
    } else {
      normalized = cleaned.replace(",", ".");
    }
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatCHF(amount: number): string {
  const rounded = roundToRappen(amount);
  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  const [whole, frac = "00"] = abs.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${negative ? "-" : ""}CHF ${grouped}.${frac}`;
}

export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return rounded.toLocaleString("de-CH", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  });
}
