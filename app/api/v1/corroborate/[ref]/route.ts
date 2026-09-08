import { NextResponse, type NextRequest } from "next/server";
import { corroborate } from "@/src/engine/corroborate";
import { errorResponse, logRequest, tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Owner lookup on six chains, then an assessment per agent found — all in
// parallel, but this is the heaviest read the service does.
export const maxDuration = 60;

type Params = { params: Promise<{ ref: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const started = Date.now();
  const limited = tooManyFree(req);
  if (limited) return limited;
  const { ref } = await params;
  try {
    const r = await corroborate(decodeURIComponent(ref));
    logRequest("corroborate", req, 200, started, { ref, chains: r.chains.length, findings: r.findings.map((f) => f.code) });
    return NextResponse.json(r);
  } catch (err) {
    const res = errorResponse(err);
    logRequest("corroborate", req, res.status, started, { ref, error: (err as Error).message });
    return res;
  }
}
