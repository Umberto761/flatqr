"use server";

import { redirect } from "next/navigation";
import { login } from "@/lib/auth";

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
