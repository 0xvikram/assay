import { NextResponse, type NextRequest } from "next/server";
import { readApprovals } from "@/src/hcs";
import { tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the agent polls while it waits for a human. Read from the ledger, not from us. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = tooManyFree(req);
  if (limited) return limited;
  const { id } = await params;
  try {
    const approvals = await readApprovals(id);
    return NextResponse.json({ mandateId: id, approvals, source: process.env.HCS_TOPIC_ID ? `hcs:${process.env.HCS_TOPIC_ID}` : "hcs:unconfigured" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
