import { NextResponse } from "next/server";
import { fail, withUser } from "@/lib/api";
import { getSettings, listInvoices, saveInvoice, takeInvoiceNumber } from "@/lib/db";
import { assembleInvoice } from "@/lib/invoice";
import type { CreateInvoiceInput } from "@/lib/types";

export async function GET() {
  const user = await withUser();
  if (user instanceof NextResponse) return user;
  const invoices = await listInvoices();
  return NextResponse.json({
    invoices: invoices.map(({ lines: _lines, ...rest }) => rest),
  });
}

export async function POST(request: Request) {
  const user = await withUser();
  if (user instanceof NextResponse) return user;
  const input = (await request.json()) as CreateInvoiceInput;
  try {
    if (!input.entries?.length) return fail("Keine Zeiten ausgewählt.");
    if (!input.clientName?.trim()) return fail("Kundenname fehlt.");
    const settings = await getSettings();
    const number = await takeInvoiceNumber();
    const invoice = assembleInvoice(input, settings, number);
    await saveInvoice(invoice);
    return NextResponse.json({ invoice });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Rechnung konnte nicht erstellt werden.");
  }
}
