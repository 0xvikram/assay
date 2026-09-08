import { NextResponse, type NextRequest } from "next/server";
import { assay } from "@/src/engine/assay";
import { errorResponse, logRequest, tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A single read fans out to one subgraph; keep headroom for a slow gateway.
export const maxDuration = 60;

type Params = { params: Promise<{ chain: string; agentId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const started = Date.now();
  const limited = tooManyFree(req);
  if (limited) return limited;
  const { chain, agentId } = await params;
  try {
    const report = await assay(`${chain}:${agentId}`);
    logRequest("agents", req, 200, started, { ref: `${chain}:${agentId}`, verdict: report.assessment.verdict, block: report.provenance.block });
    return NextResponse.json(report);
  } catch (err) {
    const res = errorResponse(err);
    logRequest("agents", req, res.status, started, { ref: `${chain}:${agentId}`, error: (err as Error).message });
    return res;
  }
}
