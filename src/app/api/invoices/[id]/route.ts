import { NextResponse } from "next/server";
import { fail, withUser } from "@/lib/api";
import { getInvoice } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await withUser();
  if (user instanceof NextResponse) return user;
  const { id } = await context.params;
  const invoice = await getInvoice(id);
  if (!invoice) return fail("Rechnung nicht gefunden.", 404);
  return NextResponse.json({ invoice });
}
