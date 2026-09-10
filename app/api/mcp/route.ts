import type { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createPaymentWrapper } from "@x402/mcp";
import { registerTools, type Wrap } from "@/src/mcp/tools";
import { NETWORK, TIERS, resourceServer, type Tier } from "@/src/x402";
import { submitReceipt } from "@/src/hcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stateless by necessity and by design: every request builds a server, answers,
 * and is gone. Paid tools are wrapped with @x402/mcp so the payment rides in
 * the tool call's _meta and settles through the same Blocky402 facilitator as
 * the REST routes — one service, two doors.
 */
function priceFor(tier: Tier) {
  return process.env.X402_ASSET === "usdc" ? TIERS[tier].usd : { asset: "0.0.0", amount: TIERS[tier].tinybar };
}

let wrappers: Promise<{ agent: Wrap; resolve: Wrap; corroborate: Wrap; lending: Wrap; note: string }> | null = null;

function paidWrappers() {
  wrappers ??= (async () => {
    const payTo = process.env.HEDERA_SERVICE_ACCOUNT_ID;
    if (!payTo) {
      const off: Wrap = () => async () => ({ content: [{ type: "text", text: "Refused: payments are not configured on this deployment (HEDERA_SERVICE_ACCOUNT_ID unset). assay_preview is free." }], isError: true });
      return { agent: off, resolve: off, corroborate: off, lending: off, note: "(unavailable: payments not configured)" };
    }
    const rs = resourceServer();
    await rs.initialize();
    const wrap = async (tier: Tier): Promise<Wrap> => {
      const accepts = await rs.buildPaymentRequirements({ scheme: "exact", network: NETWORK, payTo, price: priceFor(tier) });
      const paid = createPaymentWrapper(rs, {
        accepts,
        hooks: {
          // Same receipt as the REST routes: a settled tool call is a paid call.
          onAfterSettlement: async ({ toolName, arguments: args, settlement, paymentRequirements }) => {
            const a = args as Record<string, unknown>;
            await submitReceipt({
              type: "assay.receipt.v1",
              route: `mcp:${toolName}`,
              ref: typeof a["chain"] === "string" ? `${a["chain"]}:${a["agentId"]}` : String(a["url"] ?? a["ref"] ?? ""),
              payer: settlement.payer ?? null,
              amount: String(settlement.amount ?? paymentRequirements.amount ?? ""),
              asset: String(paymentRequirements.asset ?? ""),
              network: String(paymentRequirements.network ?? ""),
              settlementTxId: settlement.transaction ?? null,
              verdict: "",
              deployment: "",
              block: 0,
              ts: new Date().toISOString(),
            });
          },
        },
      });
      return ((h) => paid((args) => h(args as never))) as Wrap;
    };
    return {
      agent: await wrap("agents"),
      resolve: await wrap("resolve"),
      corroborate: await wrap("corroborate"),
      lending: await wrap("lending"),
      note: `Costs ${TIERS.agents.tinybar} tinybar on ${NETWORK} via x402; discovery tools are free.`,
    };
  })();
  return wrappers;
}

async function handle(req: NextRequest) {
  const w = await paidWrappers();
  const server = new McpServer({ name: "assay", version: "0.1.0" });
  registerTools(server, { agent: w.agent, resolve: w.resolve, corroborate: w.corroborate, lending: w.lending }, w.note);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // Nothing to keep: the next request builds its own.
    await transport.close().catch(() => undefined);
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
