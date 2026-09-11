import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "flatqr_session";

/** Public origin as the browser sees it (TLS-terminated proxy). */
function publicOrigin(request: NextRequest): URL {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const proto =
    forwardedProto ||
    (request.nextUrl.protocol === "https:" ? "https" : "http");
  return new URL(`${proto}://${host}`);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/health" || pathname.startsWith("/health/")) {
    return NextResponse.next();
  }

  const authed = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/app") && !authed) {
    const target = publicOrigin(request);
    target.pathname = "/";
    target.searchParams.set("next", pathname);
    return NextResponse.redirect(target);
  }

  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth/login")) {
    if (!authed) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/health", "/app/:path*", "/api/:path*"],
};
