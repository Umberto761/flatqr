import { NextResponse } from "next/server";

/** Liveness for SnapDeploy / container health checks. No auth, no DB, no redirects. */
export function GET() {
  return new NextResponse("ok", {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
