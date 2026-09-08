import { NextResponse, type NextRequest } from "next/server";
import { openapi } from "@/src/openapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const origin = process.env.PUBLIC_BASE_URL || req.nextUrl.origin;
  return NextResponse.json(openapi(origin));
}
