"use server";

import { redirect } from "next/navigation";
import { login, requireUser } from "@/lib/auth";
import { getSettings, saveInvoice, takeInvoiceNumber, updateEntries } from "@/lib/db";
import { assembleInvoice } from "@/lib/invoice";
import type { TimeEntry } from "@/lib/csv";
import type { CreateInvoiceInput } from "@/lib/types";

export async function loginAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "");
  const nextRaw = String(formData.get("next") ?? "/app");
  const next = nextRaw.startsWith("/") ? nextRaw : "/app";

  try {
    await login(email, code);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Login fehlgeschlagen.",
    };
  }

  redirect(next);
}

export async function createInvoiceAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  try {
    await requireUser();
  } catch {
    return { error: "Nicht angemeldet." };
  }

  let entries: TimeEntry[] = [];
  try {
    entries = JSON.parse(String(formData.get("entriesJson") ?? "[]")) as TimeEntry[];
  } catch {
    return { error: "Zeiten konnten nicht gelesen werden." };
  }

  const selected = entries.filter((entry) => entry.selected);
  const input: CreateInvoiceInput = {
    clientName: String(formData.get("clientName") ?? ""),
    clientAddress: String(formData.get("clientAddress") ?? ""),
    clientBuilding: String(formData.get("clientBuilding") ?? ""),
    clientZip: String(formData.get("clientZip") ?? ""),
    clientCity: String(formData.get("clientCity") ?? ""),
    clientCountry: String(formData.get("clientCountry") ?? "CH"),
    issueDate: String(formData.get("issueDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    grouping: formData.get("grouping") === "entry" ? "entry" : "task",
    entries: selected,
  };

  try {
    if (entries.length) await updateEntries(entries);
    const settings = await getSettings();
    const number = await takeInvoiceNumber();
    const invoice = assembleInvoice(input, settings, number);
    await saveInvoice(invoice);
    redirect(`/app/rechnungen/${invoice.id}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Rechnung fehlgeschlagen.",
    };
  }
}
