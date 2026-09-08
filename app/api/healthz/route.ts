import { NextResponse } from "next/server";
import { healthyChains, CHAINS } from "@/src/engine/graph/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "assay",
    chains: { healthy: healthyChains().length, registered: CHAINS.length },
    t: new Date().toISOString(),
  });
}
