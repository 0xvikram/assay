import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-core/signing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The RP signature authenticates this app to World ID. It is minted here, on
 * the server, from a key that never reaches the browser — a leaked signing key
 * lets anyone forge requests in our name.
 */
export async function POST(req: Request) {
  const key = process.env.RP_SIGNING_KEY;
  if (!key) return NextResponse.json({ error: "RP_SIGNING_KEY is not configured" }, { status: 503 });
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const { sig, nonce, createdAt, expiresAt } = signRequest({ signingKeyHex: key, action: action ?? process.env.NEXT_PUBLIC_WLD_ACTION ?? "assay-escalation" });
  return NextResponse.json({ sig, nonce, created_at: createdAt, expires_at: expiresAt });
}
