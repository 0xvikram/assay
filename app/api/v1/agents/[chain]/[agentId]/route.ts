import { NextResponse, type NextRequest } from "next/server";
import { assay } from "@/src/engine/assay";
import { errorResponse, logRequest } from "@/src/http/respond";
import { facilitatorReady, notReady, paid, recordOutcome } from "@/src/x402";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A single read fans out to one subgraph; keep headroom for a slow gateway.
export const maxDuration = 60;

// withX402 hands the handler only the request, so the segments come off the path.
const handler = async (req: NextRequest) => {
  const started = Date.now();
  const [chain = "", agentId = ""] = req.nextUrl.pathname.split("/").slice(4);
  const ready = await facilitatorReady();
  if (!ready.ok) return notReady(ready);
  try {
    const report = await assay(`${chain}:${agentId}`);
    recordOutcome(req, { route: "agents", ref: `${chain}:${agentId}`, verdict: report.assessment.verdict, deployment: report.provenance.deployment, block: report.provenance.block });
    logRequest("agents", req, 200, started, { ref: `${chain}:${agentId}`, verdict: report.assessment.verdict, block: report.provenance.block });
    return NextResponse.json(report);
  } catch (err) {
    const res = errorResponse(err);
    logRequest("agents", req, res.status, started, { ref: `${chain}:${agentId}`, error: (err as Error).message });
    return res;
  }
};

export const GET = paid("/api/v1/agents/[chain]/[agentId]", "agents", handler);
