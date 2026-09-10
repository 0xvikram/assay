import { NextResponse, type NextRequest } from "next/server";
import { resolveChain } from "@/src/engine/assay";
import { fetchAgent } from "@/src/engine/graph/queries";
import { errorResponse, tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * A stand-in paid endpoint for the guard demo. It answers with a genuine x402
 * v2 challenge whose payTo is the real wallet the named agent registered
 * on-chain, so the guard has to identify a real counterparty from a real
 * address. The endpoint is a stand-in; the address and the verdict are not.
 *
 * It never settles. There is no facilitator behind it, so an authorization a
 * client signs against it moves nothing — a client without the guard cannot
 * be made to pay the named agent through here.
 */
export async function GET(req: NextRequest) {
  const limited = tooManyFree(req, 30);
  if (limited) return limited;
  const as = req.nextUrl.searchParams.get("as") ?? "base:25975";
  const [chainRef, agentId] = as.split(":");
  try {
    if (!chainRef || !agentId) throw new Error('Reference must be "<chain>:<agentId>", e.g. base:25975');
    const chain = resolveChain(chainRef);
    const { data } = await fetchAgent(chain, agentId, 1);
    if (!data.agent) throw new Error(`No agent ${agentId} registered on ${chain.name}.`);
    const payTo = data.agent.agentWallet ?? data.agent.owner;
    const required = {
      x402Version: 2,
      error: "Payment required",
      resource: {
        url: req.nextUrl.toString(),
        description: `Demo stand-in: a paid endpoint that pays ${as}'s registered wallet. Never settles.`,
        mimeType: "application/json",
        serviceName: "Assay guard demo",
      },
      accepts: [{
        scheme: "exact", network: "eip155:84532", amount: "1000",
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        payTo, maxTimeoutSeconds: 300, extra: { name: "USDC", version: "2" },
      }],
    };
    return new NextResponse("{}", {
      status: 402,
      headers: { "content-type": "application/json", "payment-required": Buffer.from(JSON.stringify(required)).toString("base64") },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
