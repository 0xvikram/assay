import { NextResponse } from "next/server";
import { readApprovals, submitMessage } from "@/src/hcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The proof is forwarded to World byte-for-byte; only their verifier can say
 * it is real. A valid proof approves exactly one escalation, and the approval
 * is an HCS message — the same public trail the receipts live on. The
 * nullifier is the replay key: one human, one action, one approval.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { rp_id: string; idkitResponse: unknown; escalation: { mandateId: string; id: string; newCap: string } }
    | null;
  if (!body?.rp_id || !body.idkitResponse || !body.escalation?.id) {
    return NextResponse.json({ error: "rp_id, idkitResponse and escalation are required" }, { status: 400 });
  }

  const res = await fetch(`https://developer.world.org/api/v4/verify/${body.rp_id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body.idkitResponse),
    signal: AbortSignal.timeout(20_000),
  });
  const verdict = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return NextResponse.json({ error: "verification_failed", detail: verdict }, { status: 400 });
  }

  const nullifier = findNullifier(body.idkitResponse) ?? findNullifier(verdict);
  if (!nullifier) return NextResponse.json({ error: "no nullifier in the verified response" }, { status: 400 });

  // Replay: the same human may not approve the same escalation twice.
  const prior = await readApprovals(body.escalation.mandateId).catch(() => []);
  if (prior.some((a) => a.nullifier === nullifier && a.escalationId === body.escalation.id)) {
    return NextResponse.json({ error: "already_approved", detail: "this credential already approved this escalation" }, { status: 409 });
  }

  const seq = await submitMessage({
    type: "assay.approval.v1",
    mandateId: body.escalation.mandateId,
    escalationId: body.escalation.id,
    newCap: body.escalation.newCap,
    nullifier,
    credential: "selfie",
    ts: new Date().toISOString(),
  });
  return NextResponse.json({ success: true, approval: { escalationId: body.escalation.id, seq } });
}

function findNullifier(v: unknown, depth = 0): string | null {
  if (!v || typeof v !== "object" || depth > 4) return null;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (/nullifier/i.test(k) && typeof val === "string" && val.length > 0) return val;
    if (Array.isArray(val)) for (const item of val) { const hit = findNullifier(item, depth + 1); if (hit) return hit; }
    else if (val && typeof val === "object") { const hit = findNullifier(val, depth + 1); if (hit) return hit; }
  }
  return null;
}
