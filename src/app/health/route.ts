import { NextResponse } from "next/server";

/** Liveness for SnapDeploy / container health checks. No auth, no DB, no redirects. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function health(): NextResponse {
  return new NextResponse("ok", {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function GET() {
  return health();
}

export function HEAD() {
  return health();
}
