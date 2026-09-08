/**
 * The quote step of the pre-flight recipe: before paying a counterparty, know
 * exactly what the payment costs in the asset it wants. Uniswap's Trading API
 * quotes the swap; nothing here executes it — the mandate decides that.
 *
 * Docs used: https://developers.uniswap.org/docs/api-reference (base URL, x-api-key)
 * and https://developers.uniswap.org/docs/api-reference/aggregator_quote (body).
 */
export const UNISWAP_API = process.env.UNISWAP_API_URL ?? "https://trade-api.gateway.uniswap.org/v1";

/** Canonical mainnet/Base addresses so the CLI can take symbols. Anything else is passed through as an address. */
const TOKENS: Record<number, Record<string, `0x${string}`>> = {
  1: { USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
  8453: { USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", WETH: "0x4200000000000000000000000000000000000006" },
};

export interface QuoteInput { chainId: number; tokenIn: string; tokenOut: string; amount: string; swapper: `0x${string}`; slippageTolerance?: number }
export interface Quote { requestId: string; routing: string; quote: Record<string, unknown>; raw: Record<string, unknown> }

function resolveToken(chainId: number, t: string): string {
  return t.startsWith("0x") ? t : (TOKENS[chainId]?.[t.toUpperCase()] ?? (() => { throw new Error(`Unknown token symbol ${t} on chain ${chainId}; pass an address.`); })());
}

export async function quote(input: QuoteInput): Promise<Quote> {
  const key = process.env.UNISWAP_API_KEY;
  if (!key) throw new Error("UNISWAP_API_KEY is not set (developers.uniswap.org/dashboard).");
  const body = {
    type: "EXACT_INPUT",
    amount: input.amount,
    tokenInChainId: input.chainId,
    tokenOutChainId: input.chainId,
    tokenIn: resolveToken(input.chainId, input.tokenIn),
    tokenOut: resolveToken(input.chainId, input.tokenOut),
    swapper: input.swapper,
    slippageTolerance: input.slippageTolerance ?? 0.5,
  };
  const res = await fetch(`${UNISWAP_API}/quote`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "x-universal-router-version": "2.0" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Uniswap quote HTTP ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return { requestId: String(json["requestId"] ?? ""), routing: String(json["routing"] ?? ""), quote: (json["quote"] as Record<string, unknown>) ?? {}, raw: json };
}

// ---- CLI: npm run agent:quote -- --chain 8453 --in USDC --out WETH --amount 1000000 ----
if (process.argv[1]?.endsWith("quote.ts")) {
  const a = process.argv.slice(2);
  const flag = (n: string, d?: string) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : d; };
  const swapper = (process.env.SERVICE_EVM_ADDRESS ?? flag("--swapper") ?? "0x000000000000000000000000000000000000dEaD") as `0x${string}`;
  const q = await quote({
    chainId: Number(flag("--chain", "8453")),
    tokenIn: flag("--in", "USDC")!,
    tokenOut: flag("--out", "WETH")!,
    amount: flag("--amount", "1000000")!,
    swapper,
  });
  const out = q.quote["output"] as { amount?: string; token?: string } | undefined;
  const inp = q.quote["input"] as { amount?: string; token?: string } | undefined;
  console.log(`\n  routing ${q.routing}  request ${q.requestId}`);
  console.log(`  in   ${inp?.amount ?? "?"} of ${inp?.token ?? "?"}`);
  console.log(`  out  ${out?.amount ?? "?"} of ${out?.token ?? "?"}`);
  console.log(`  gas  ${String(q.quote["gasFeeUSD"] ?? q.quote["gasFee"] ?? "?")}\n`);
}
