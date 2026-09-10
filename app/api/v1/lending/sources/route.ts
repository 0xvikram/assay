import { NextResponse, type NextRequest } from "next/server";
import { SOURCES } from "@/src/lending";
import { tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";

/** Free: which sources exist, their versions, and why any is not servable. */
export async function GET(req: NextRequest) {
  const limited = tooManyFree(req);
  if (limited) return limited;
  return NextResponse.json({
    sources: SOURCES.map((s) => ({
      key: s.key, protocol: s.protocol, network: s.network, healthy: s.healthy,
      schemaVersion: s.schemaVersion, methodologyVersion: s.methodologyVersion,
      ...(s.unhealthyReason ? { unhealthyReason: s.unhealthyReason } : {}),
    })),
    note: "Comparison is attempted only between sources whose schemaVersion and methodologyVersion both match. Versions are re-read from each subgraph on every request, never trusted from this list.",
  });
}
