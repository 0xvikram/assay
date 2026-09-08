import { NextResponse } from "next/server";
import { CHAINS } from "@/src/engine/graph/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ chains: CHAINS });
}
