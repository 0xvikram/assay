import { NextResponse, type NextRequest } from "next/server";
import { AccountError, policyById } from "@/src/saas/accounts";
import { tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A policy's rules, for the guard running inside a company's agent. Public by
 * id: the rules say what the company's agents will pay, not who they pay, and
 * the id is unguessable.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ policyId: string }> }) {
  const limited = tooManyFree(req, 60);
  if (limited) return limited;
  const { policyId } = await params;
  try {
    const p = await policyById(policyId);
    return p ? NextResponse.json(p) : NextResponse.json({ error: `No saved policy ${policyId}. Save one in the dashboard first.` }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof AccountError ? e.status : 502 });
  }
}
