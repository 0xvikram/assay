import { NextResponse, type NextRequest } from "next/server";
import { resolveEndpoint } from "@/src/engine/resolve";
import { errorResponse, logRequest } from "@/src/http/respond";
import { facilitatorReady, notReady, paid, recordOutcome } from "@/src/x402";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Six chains in parallel; the slowest one sets the clock.
export const maxDuration = 60;

const handler = async (req: NextRequest) => {
  const started = Date.now();
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url query parameter is required" }, { status: 400 });
  const ready = await facilitatorReady();
  if (!ready.ok) return notReady(ready);
  try {
    const r = await resolveEndpoint(url);
    recordOutcome(req, { route: "resolve", ref: url, verdict: `${r.matches.length} matches`, deployment: "", block: 0 });
    logRequest("resolve", req, 200, started, { url, matches: r.matches.length, failures: r.failures.length });
    return NextResponse.json({
      ...r,
      matches: r.matches.map((m) => ({ chain: m.chain.key, chainId: m.chain.chainId, agent: m.agent, matchedOn: m.matchedOn, matchedValue: m.matchedValue })),
    });
  } catch (err) {
    const res = errorResponse(err);
    logRequest("resolve", req, res.status, started, { error: (err as Error).message });
    return res;
  }
};

export const GET = paid("/api/v1/resolve", "resolve", handler);
