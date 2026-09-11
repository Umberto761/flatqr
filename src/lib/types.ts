export interface IbanInfo {
  compact: string;
  valid: boolean;
  qrIban: boolean;
  sample: boolean;
}

export interface SellerSettings {
  name: string;
  address: string;
  buildingNumber: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  vatNumber: string;
  iban: string;
  defaultHourlyRate: number;
  defaultVatRate: number;
  paymentDays: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
}

export interface InvoiceLine {
  id: string;
  description: string;
  hours: number;
  unitPrice: number;
  vatRate: number;
  net: number;
  vat: number;
  gross: number;
}

export interface InvoiceRecord {
  id: string;
  number: string;
  status: "draft" | "ready";
  clientName: string;
  clientAddress: string;
  clientBuilding: string;
  clientZip: string;
  clientCity: string;
  clientCountry: string;
  issueDate: string;
  dueDate: string;
  currency: "CHF";
  notes: string;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  reference: string;
  usingSampleCreditor: boolean;
  createdAt: string;
  updatedAt: string;
  lines: InvoiceLine[];
}

export interface CreateInvoiceInput {
  clientName: string;
  clientAddress: string;
  clientBuilding: string;
  clientZip: string;
  clientCity: string;
  clientCountry: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  grouping: "entry" | "task";
  entries: Array<{
    date: string;
    client: string;
    project: string;
    task: string;
    notes: string;
    hours: number;
    billableRate: number;
    vatRate: number;
  }>;
}
