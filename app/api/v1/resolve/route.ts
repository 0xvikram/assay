import { NextResponse, type NextRequest } from "next/server";
import { resolveEndpoint } from "@/src/engine/resolve";
import { errorResponse, logRequest, tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Six chains in parallel; the slowest one sets the clock.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const started = Date.now();
  const limited = tooManyFree(req);
  if (limited) return limited;
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url query parameter is required" }, { status: 400 });
  try {
    const r = await resolveEndpoint(url);
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
}
