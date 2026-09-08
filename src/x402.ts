import { NextResponse, type NextRequest } from "next/server";
import { HTTPFacilitatorClient, x402ResourceServer, type FacilitatorClient, type RouteConfig, type RoutesConfig } from "@x402/core/server";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { BatchFacilitatorClient, GatewayEvmScheme } from "@circle-fin/x402-batching/server";
import { withX402 } from "@x402/next";
import { privateKeyToAccount } from "viem/accounts";
import { submitReceipt } from "./hcs";

export const FACILITATOR_URL = process.env.X402_FACILITATOR_URL ?? "https://api.testnet.blocky402.com";
export const NETWORK = "hedera:testnet";
export const HBAR = "0.0.0";
export const USDC_TESTNET = "0.0.429274";
/** Arc testnet (Circle). USDC is the gas token; payments are batched by Circle Gateway. */
export const ARC_NETWORK = "eip155:5042002";
/** The SDK defaults to the mainnet Gateway, which does not list Arc testnet. */
export const ARC_GATEWAY_URL = process.env.ARC_GATEWAY_URL ?? "https://gateway-api-testnet.circle.com";

/** The Arc seller is the service's EVM key unless told otherwise — one fewer thing to fund. */
export function arcSeller(): `0x${string}` | null {
  const explicit = process.env.ARC_SELLER_ADDRESS as `0x${string}` | undefined;
  if (explicit) return explicit;
  const key = process.env.SERVICE_EVM_PRIVATE_KEY as `0x${string}` | undefined;
  return key ? privateKeyToAccount(key).address : null;
}

export type Tier = "agents" | "resolve" | "corroborate" | "lending";

/**
 * Priced by the work done, not per request: a cross-chain corroboration reads
 * six subgraphs and assesses every agent it finds, so it costs four single
 * reads. Testnet HBAR has no dollar price — the ratios are the metering; the
 * USDC column is what the same tiers cost when X402_ASSET=usdc.
 */
export const TIERS: Record<Tier, { tinybar: string; usd: string; description: string }> = {
  resolve:     { tinybar: "500000",  usd: "$0.0005", description: "Which registered agents claim this endpoint URL" },
  agents:      { tinybar: "1000000", usd: "$0.001",  description: "Verdict, evidence, next steps and provenance for one agent" },
  lending:     { tinybar: "2000000", usd: "$0.002",  description: "Lending evidence reconciled across standardized subgraphs" },
  corroborate: { tinybar: "4000000", usd: "$0.004",  description: "The same owner across every healthy chain, each agent assessed" },
};

function price(tier: Tier) {
  return process.env.X402_ASSET === "usdc" ? TIERS[tier].usd : { asset: HBAR, amount: TIERS[tier].tinybar };
}

export interface Outcome { route: string; ref: string; verdict: string; deployment: string; block: number }

/**
 * The handler knows the verdict; the settle hook, which runs afterwards, knows
 * the transaction. The only thing both can see is the signed payment itself:
 * the handler reads it off the request header, the hook gets it decoded. Keyed
 * by that signature, held for the seconds between handler and settlement, then
 * dropped — a hand-off, not a store.
 */
const outcomes = new Map<string, { at: number; outcome: Outcome }>();
const HANDOFF_TTL_MS = 120_000;

function paymentKey(payload: unknown): string | null {
  const p = payload as { payload?: Record<string, unknown>; signature?: string } | null;
  const inner = p?.payload;
  const candidate = inner?.["transaction"] ?? inner?.["signature"] ?? p?.signature ?? (inner ? JSON.stringify(inner) : null);
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

export function recordOutcome(req: NextRequest, outcome: Outcome) {
  const header = req.headers.get("payment-signature") ?? req.headers.get("x-payment");
  if (!header) return;
  let decoded: unknown = null;
  try { decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8")); } catch { return; }
  const key = paymentKey(decoded);
  if (!key) return;
  const now = Date.now();
  for (const [k, v] of outcomes) if (now - v.at > HANDOFF_TTL_MS) outcomes.delete(k);
  outcomes.set(key, { at: now, outcome });
}

function takeOutcome(payload: unknown): Outcome | undefined {
  const key = paymentKey(payload);
  if (!key) return undefined;
  const hit = outcomes.get(key);
  outcomes.delete(key);
  return hit?.outcome;
}

let server: x402ResourceServer | null = null;

export function resourceServer(): x402ResourceServer {
  if (server) return server;
  // Two rails, one engine: Blocky402 settles Hedera; Circle Gateway batches Arc.
  // A route's 402 lists both and the client picks the one it can pay on.
  // @circle-fin/x402-batching 3.4.0 inlines its own copy of the core types with
  // ResourceInfo.description optional where @x402/core 2.25 requires it — a
  // declaration drift, not a runtime one. Cast at this one boundary.
  const circle = new BatchFacilitatorClient({ url: ARC_GATEWAY_URL }) as unknown as FacilitatorClient;
  server = new x402ResourceServer([new HTTPFacilitatorClient({ url: FACILITATOR_URL }), circle])
    .register("hedera:*", new ExactHederaScheme({ defaultAssets: { [NETWORK]: { asset: USDC_TESTNET, decimals: 6 } } }))
    .register(ARC_NETWORK, new GatewayEvmScheme())
    .onAfterSettle(async (ctx) => {
      if (!ctx.result.success) return;
      const outcome = takeOutcome(ctx.paymentPayload);
      await submitReceipt({
        type: "assay.receipt.v1",
        route: outcome?.route ?? "",
        ref: outcome?.ref ?? "",
        payer: ctx.result.payer ?? null,
        amount: String(ctx.result.amount ?? ctx.requirements.amount ?? ""),
        asset: String(ctx.requirements.asset ?? ""),
        network: String(ctx.requirements.network ?? ""),
        settlementTxId: ctx.result.transaction ?? null,
        verdict: outcome?.verdict ?? "",
        deployment: outcome?.deployment ?? "",
        block: outcome?.block ?? 0,
        ts: new Date().toISOString(),
      });
    })
    .onSettleFailure(async (ctx) => {
      console.warn(JSON.stringify({ t: new Date().toISOString(), x402: "settle_failed", network: ctx.requirements.network, error: ctx.error.message }));
    });
  return server;
}

type Handler = (req: NextRequest) => Promise<NextResponse>;

/**
 * Gate one route handler. Per route, never in proxy/middleware: the Hedera
 * scheme needs Node, and withX402 settles only after the handler succeeds, so
 * nobody pays for an error. Without a service account there is nothing to be
 * paid to, and the route says so rather than pretending.
 */
export function paid(pattern: string, tier: Tier, handler: Handler): Handler {
  const payTo = process.env.HEDERA_SERVICE_ACCOUNT_ID;
  if (!payTo) {
    return async () => NextResponse.json(
      { error: "payments_not_configured", detail: "HEDERA_SERVICE_ACCOUNT_ID is not set on this deployment; the free preview route still works." },
      { status: 503 },
    );
  }
  const seller = arcSeller();
  type Option = Extract<RouteConfig["accepts"], unknown[]>[number];
  const hedera: Option = { scheme: "exact", network: NETWORK, payTo, price: price(tier) };
  const arc: Option | null = seller ? { scheme: "exact", network: ARC_NETWORK, payTo: seller, price: TIERS[tier].usd } : null;
  const accepts: Option[] = arc ? [hedera, arc] : [hedera];
  const routes: RoutesConfig = {
    [pattern]: {
      accepts,
      description: TIERS[tier].description,
      mimeType: "application/json",
      serviceName: "Assay",
    },
  };
  return withX402(handler, routes, resourceServer());
}

let supportedAt = 0;
let supported: { ok: boolean; feePayer?: string; error?: string } = { ok: false, error: "not checked" };

/**
 * A 402 that names a facilitator which cannot settle Hedera is a broken
 * promise. Ask it, remember for a minute, and fail the request as 503 rather
 * than take a payment nobody can clear.
 */
export async function facilitatorReady() {
  if (Date.now() - supportedAt < 60_000) return supported;
  try {
    const res = await fetch(`${FACILITATOR_URL}/supported`, { signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "assay/0.1 (+x402)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { kinds?: { network: string; extra?: { feePayer?: string } }[] };
    const kind = j.kinds?.find((k) => k.network === NETWORK);
    supported = kind ? { ok: true, feePayer: kind.extra?.feePayer } : { ok: false, error: `${FACILITATOR_URL} does not advertise ${NETWORK}` };
  } catch (err) {
    supported = { ok: false, error: `${FACILITATOR_URL}: ${(err as Error).message}` };
  }
  supportedAt = Date.now();
  return supported;
}

export function notReady(s: { error?: string }) {
  return NextResponse.json({ error: "facilitator_unavailable", detail: s.error }, { status: 503 });
}
