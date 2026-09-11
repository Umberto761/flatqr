import { NextResponse } from "next/server";
import { fail, withUser } from "@/lib/api";
import { listEntries, updateEntries } from "@/lib/db";
import type { TimeEntry } from "@/lib/csv";

export async function GET() {
  const user = await withUser();
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ entries: await listEntries() });
}

export async function PATCH(request: Request) {
  const user = await withUser();
  if (user instanceof NextResponse) return user;
  const body = (await request.json()) as { entries?: TimeEntry[] };
  if (!body.entries?.length) return fail("Keine Zeilen zum Speichern.");
  await updateEntries(body.entries);
  return NextResponse.json({ entries: await listEntries() });
}
