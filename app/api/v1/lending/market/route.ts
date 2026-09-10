import { NextResponse, type NextRequest } from "next/server";
import { compareMarket, marketSnapshot, SOURCES } from "@/src/lending";
import { errorResponse, logRequest } from "@/src/http/respond";
import { facilitatorReady, notReady, paid, recordOutcome } from "@/src/x402";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Two Messari deployments are read in parallel; leave room for a slow gateway.
export const maxDuration = 60;

/**
 * `?asset=USDC&sources=a,b` reconciles two sources; a single source returns the
 * snapshot instead. Composition, not a passthrough: the answer is the verdict
 * about whether the two are comparable at all, and every read carries its own
 * deployment and block.
 */
const handler = async (req: NextRequest) => {
  const started = Date.now();
  const q = req.nextUrl.searchParams;
  const asset = (q.get("asset") ?? "USDC").trim();
  const keys = (q.get("sources") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const ready = await facilitatorReady();
  if (!ready.ok) return notReady(ready);

  try {
    if (keys.length === 0) {
      return NextResponse.json({
        error: "Name the sources to read, e.g. ?asset=USDC&sources=compound-v3-ethereum,spark-lend-ethereum",
        servable: SOURCES.filter((s) => s.healthy).map((s) => s.key),
        notServable: SOURCES.filter((s) => !s.healthy).map((s) => ({ key: s.key, reason: s.unhealthyReason })),
      }, { status: 400 });
    }
    if (keys.length > 2) throw new Error(`Reconciliation compares two sources; got ${keys.length}.`);

    if (keys.length === 1) {
      const snap = await marketSnapshot(keys[0]!, asset);
      logRequest("lending", req, 200, started, { asset, sources: keys.join(","), mode: "snapshot" });
      return NextResponse.json(snap);
    }

    const report = await compareMarket(keys[0]!, keys[1]!, asset);
    const c = report.comparison;
    recordOutcome(req, {
      route: "lending",
      ref: `${asset}:${keys.join("|")}`,
      verdict: c.reconciliation === "NOT_ATTEMPTED" ? c.comparability : c.reconciliation,
      deployment: report.provenance[0]?.deployment ?? "",
      block: report.provenance[0]?.block ?? 0,
    });
    logRequest("lending", req, 200, started, { asset, sources: keys.join(","), comparability: c.comparability, reconciliation: c.reconciliation });
    return NextResponse.json(report);
  } catch (err) {
    const res = errorResponse(err);
    logRequest("lending", req, res.status, started, { asset, sources: keys.join(","), error: (err as Error).message });
    return res;
  }
};

export const GET = paid("/api/v1/lending/market", "lending", handler);
