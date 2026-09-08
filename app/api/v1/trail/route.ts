import { NextResponse, type NextRequest } from "next/server";
import { readMessages } from "@/src/hcs";
import { tooManyFree, LEDGER_PER_WINDOW } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The action trail, read the way anyone else can read it: from the mirror
 * node. Free, because it is public information about payments already made.
 */
export async function GET(req: NextRequest) {
  const limited = tooManyFree(req, LEDGER_PER_WINDOW);
  if (limited) return limited;
  const topic = process.env.HCS_TOPIC_ID ?? null;
  if (!topic) return NextResponse.json({ topic: null, entries: [] });
  try {
    const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 25));
    const raw = await readMessages(limit);
    const entries = raw
      .filter((m) => m.message)
      .map((m) => {
        const x = m.message!;
        const base = { seq: m.seq, at: new Date(Number(m.consensusAt.split(".")[0]) * 1000).toISOString(), messageUrl: `https://hashscan.io/testnet/topic/${topic}/message/${m.seq}` };
        if (x.type === "assay.receipt.v1") {
          const network = x.network || (x.asset === "0.0.0" ? "hedera:testnet" : "");
          const settlementUrl = network.startsWith("hedera") && x.settlementTxId ? `https://hashscan.io/testnet/transaction/${encodeURIComponent(x.settlementTxId)}` : null;
          return { ...base, kind: "receipt" as const, route: x.route, ref: x.ref, verdict: x.verdict, payer: x.payer, amount: x.amount, asset: x.asset, network, settlementTxId: x.settlementTxId, settlementUrl };
        }
        return { ...base, kind: "approval" as const, mandateId: x.mandateId, escalationId: x.escalationId, newCap: x.newCap, credential: x.credential };
      });
    return NextResponse.json({ topic, topicUrl: `https://hashscan.io/testnet/topic/${topic}`, entries });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
