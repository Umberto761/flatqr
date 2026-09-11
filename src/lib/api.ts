import { NextResponse } from "next/server";
import { requireUser } from "./auth";

export async function withUser(): Promise<string | NextResponse> {
  try {
    return await requireUser();
  } catch {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
}

export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
