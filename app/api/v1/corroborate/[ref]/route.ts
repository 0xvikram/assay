import { NextResponse, type NextRequest } from "next/server";
import { corroborate } from "@/src/engine/corroborate";
import { errorResponse, logRequest } from "@/src/http/respond";
import { facilitatorReady, notReady, paid, recordOutcome } from "@/src/x402";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Owner lookup on six chains, then an assessment per agent found — all in
// parallel, but this is the heaviest read the service does, and priced so.
export const maxDuration = 60;

const handler = async (req: NextRequest) => {
  const started = Date.now();
  const ref = decodeURIComponent(req.nextUrl.pathname.split("/").slice(4)[0] ?? "");
  const ready = await facilitatorReady();
  if (!ready.ok) return notReady(ready);
  try {
    const r = await corroborate(ref);
    recordOutcome(req, { route: "corroborate", ref, verdict: r.findings.map((f) => f.code).join(",") || "CONSISTENT", deployment: "", block: 0 });
    logRequest("corroborate", req, 200, started, { ref, chains: r.chains.length, findings: r.findings.map((f) => f.code) });
    return NextResponse.json(r);
  } catch (err) {
    const res = errorResponse(err);
    logRequest("corroborate", req, res.status, started, { ref, error: (err as Error).message });
    return res;
  }
};

export const GET = paid("/api/v1/corroborate/[ref]", "corroborate", handler);
