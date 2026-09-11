import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { fail } from "@/lib/api";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; code?: string };
  try {
    await login(body.email ?? "", body.code ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Login fehlgeschlagen", 401);
  }
}
