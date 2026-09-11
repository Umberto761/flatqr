import {
  calculateQRReferenceChecksum,
  calculateSCORReferenceChecksum,
  isIBANValid,
  isQRIBAN,
} from "swissqrbill/utils";

export const SAMPLE_QR_IBAN = "CH4431999123000889012";

export function compactIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

export function sellerUsesSampleIban(iban: string): boolean {
  const compact = compactIban(iban);
  return !compact || compact === SAMPLE_QR_IBAN;
}

export function describeIban(iban: string): {
  compact: string;
  valid: boolean;
  qrIban: boolean;
  sample: boolean;
} {
  const compact = compactIban(iban);
  return {
    compact,
    valid: compact.length > 0 && isIBANValid(compact),
    qrIban: compact.length > 0 && isQRIBAN(compact),
    sample: sellerUsesSampleIban(compact),
  };
}

export function makeQrReference(invoiceNumber: string): string {
  const digits = invoiceNumber.replace(/\D/g, "") || "1";
  const body = digits.padStart(26, "0").slice(-26);
  return `${body}${calculateQRReferenceChecksum(body)}`;
}

export function makeScorReference(invoiceNumber: string): string {
  const payload = invoiceNumber.replace(/[^A-Za-z0-9]/g, "").slice(-21) || "1";
  const checksum = calculateSCORReferenceChecksum(payload);
  return `RF${checksum}${payload}`;
}

export function referenceForAccount(iban: string, invoiceNumber: string): string {
  return isQRIBAN(compactIban(iban))
    ? makeQrReference(invoiceNumber)
    : makeScorReference(invoiceNumber);
}
