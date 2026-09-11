import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "flatqr_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/app") && !authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth/login")) {
    if (!authed) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};
