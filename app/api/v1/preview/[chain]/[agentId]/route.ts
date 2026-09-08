import { NextResponse, type NextRequest } from "next/server";
import { assay } from "@/src/engine/assay";
import { errorResponse, logRequest, tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ chain: string; agentId: string }> };

/** The free tier: the verdict and how much it is worth, nothing that explains it. */
export async function GET(req: NextRequest, { params }: Params) {
  const started = Date.now();
  const limited = tooManyFree(req);
  if (limited) return limited;
  const { chain, agentId } = await params;
  try {
    const r = await assay(`${chain}:${agentId}`);
    logRequest("preview", req, 200, started, { ref: `${chain}:${agentId}`, verdict: r.assessment.verdict });
    return NextResponse.json({
      agent: r.agent.id,
      verdict: r.assessment.verdict,
      confidence: r.assessment.confidence,
      provenance: { deployment: r.provenance.deployment, block: r.provenance.block },
      full: `/api/v1/agents/${chain}/${agentId}`,
    });
  } catch (err) {
    const res = errorResponse(err);
    logRequest("preview", req, res.status, started, { error: (err as Error).message });
    return res;
  }
}
