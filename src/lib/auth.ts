import { cookies } from "next/headers";
import { createSession, deleteSession, getSessionEmail } from "./db";

export const SESSION_COOKIE = "flatqr_session";

export function expectedBetaCode(): string {
  return process.env.BETA_ACCESS?.trim() || "flatqr-beta";
}

export function verifyBetaCode(code: string): boolean {
  return code.trim() === expectedBetaCode();
}

export async function login(email: string, code: string): Promise<void> {
  if (!email.includes("@")) {
    throw new Error("Bitte eine gültige E-Mail angeben.");
  }
  if (!verifyBetaCode(code)) {
    throw new Error("Beta-Code ungültig. Polar-Zugang ist in v1 noch nicht angebunden.");
  }
  const token = await createSession(email.trim().toLowerCase());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // SnapDeploy terminates TLS in front of HTTP. Public URL is HTTPS.
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionEmail(token);
}

export async function requireUser(): Promise<string> {
  const email = await currentUser();
  if (!email) {
    throw new Error("UNAUTHENTICATED");
  }
  return email;
}

export async function requirePageUser(): Promise<string> {
  const email = await currentUser();
  if (!email) {
    const { redirect } = await import("next/navigation");
    redirect("/");
  }
  return email as string;
}
