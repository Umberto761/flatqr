import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "flatqr_session";

function isUngated(pathname: string): boolean {
  return (
    pathname === "/health" ||
    pathname.startsWith("/health/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/_next/static/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  );
}

/** Public origin as the browser sees it (TLS-terminated proxy). Never force HTTPS. */
function publicOrigin(request: NextRequest): URL {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const proto =
    forwardedProto ||
    request.nextUrl.protocol.replace(/:$/, "") ||
    "http";
  return new URL(`${proto}://${host}`);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /health and static assets must never 30x (SnapDeploy + Cloudflare 308 loop).
  if (isUngated(pathname)) {
    return NextResponse.next();
  }

  const authed = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/app") && !authed) {
    const target = publicOrigin(request);
    target.pathname = "/";
    target.searchParams.set("next", pathname);
    return NextResponse.redirect(target, 307);
  }

  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth/login")) {
    if (!authed) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  // Do not match /health — even a no-op proxy can 308 after URL normalize.
  matcher: ["/app/:path*", "/api/:path*"],
};
