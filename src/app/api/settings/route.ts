import { NextResponse } from "next/server";
import { fail, withUser } from "@/lib/api";
import { getSettings, saveSettings } from "@/lib/db";
import { describeIban } from "@/lib/qr";
import type { SellerSettings } from "@/lib/types";

export async function GET() {
  const user = await withUser();
  if (user instanceof NextResponse) return user;
  const settings = await getSettings();
  return NextResponse.json({
    settings,
    iban: describeIban(settings.iban),
  });
}

export async function PUT(request: Request) {
  const user = await withUser();
  if (user instanceof NextResponse) return user;
  const settings = (await request.json()) as SellerSettings;
  if (!settings.name?.trim()) return fail("Name des Gläubigers fehlt.");
  if (!settings.iban?.trim()) return fail("IBAN fehlt.");
  await saveSettings({
    ...settings,
    country: (settings.country || "CH").toUpperCase(),
    name: settings.name.trim(),
    address: settings.address.trim(),
    buildingNumber: settings.buildingNumber.trim(),
    zip: settings.zip.trim(),
    city: settings.city.trim(),
    email: settings.email.trim(),
    iban: settings.iban.replace(/\s+/g, "").toUpperCase(),
  });
  const stored = await getSettings();
  return NextResponse.json({
    settings: stored,
    iban: describeIban(stored.iban),
  });
}
