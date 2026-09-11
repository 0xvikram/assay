import { NextResponse, type NextRequest } from "next/server";
import { readAll } from "@/src/hcs";
import { tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The whole ledger as CSV, for an auditor: every payment, refusal, approval and escalation, with its sequence number to check against HashScan. */
export async function GET(req: NextRequest) {
  const limited = tooManyFree(req, 10);
  if (limited) return limited;
  const rows = await readAll(0);
  const lines = [["seq", "consensus_at", "type", "ref", "verdict", "payer", "amount", "asset", "network", "tx", "allowed", "escalation", "detail"].join(",")];
  for (const r of rows) {
    const m = r.message;
    if (!m) continue;
    const at = new Date(Number(r.consensusAt.split(".")[0]) * 1000).toISOString();
    if (m.type === "assay.receipt.v1") lines.push([r.seq, at, "check", m.ref, m.verdict, m.payer, m.amount, m.asset, m.network, m.settlementTxId, "", "", m.route].map(cell).join(","));
    else if (m.type === "assay.settlement.v1") lines.push([r.seq, at, "payment", m.ref, m.verdict, "", m.valueWei, "wei", m.network, m.txHash, m.allowed, "", m.refusedBecause ?? ""].map(cell).join(","));
    else if (m.type === "assay.escalation.v1") lines.push([r.seq, at, "approval requested", m.ref, "", "", m.cap, "", "", "", "", m.escalationId, m.why].map(cell).join(","));
    else if (m.type === "assay.approval.v1") lines.push([r.seq, at, "approval", "", "", "", m.newCap, "", "", "", "", m.escalationId, m.credential].map(cell).join(","));
  }
  return new NextResponse(lines.join("\n") + "\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="assay-ledger-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
