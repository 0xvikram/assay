import { createPublicClient, decodeEventLog, http, parseAbi, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { decodePaymentResponseHeader } from "@x402/fetch";
import { BASE_SEPOLIA, writeReceipt } from "../agent/receipt";

/**
 * The other half of the guard. The guard stops a payment to a farm; this makes
 * every payment that does go through count. Once a payment settles, it finds
 * the agent that was paid and writes the buyer's ERC-8004 review of it, with
 * the settlement attached as proof of payment. Nobody has to fill in a form,
 * and the review cannot be faked, because it cost exactly what the work cost.
 *
 * Base Sepolia only for now: that is the one registry receipts are written to.
 */
const TRANSFER = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"]);

export interface SettledTransfer { from: `0x${string}`; to: `0x${string}`; value: bigint; token: `0x${string}` | null; txHash: Hex }

export interface SellerMatch { ref: string; chain: string; agentId: string; matchedOn: string }

export type ReceiptOutcome =
  | { status: "written"; ref: string; txHash: Hex; feedbackURI: string; explorer: string; proof: SettledTransfer }
  | { status: "skipped"; reason: string };

type RawLog = { address: `0x${string}`; topics: readonly Hex[]; data: Hex };

/**
 * Who paid whom, read from the settlement rather than taken on anyone's word.
 * An x402 payment on an EVM chain is a token transfer the facilitator submits,
 * so the transaction's sender is the facilitator and the Transfer log names
 * the real payer and payee. A plain wallet payment has no log; the transaction
 * itself carries the value.
 */
export function transferFrom(tx: { from: `0x${string}`; to: `0x${string}` | null; value: bigint; hash: Hex }, logs: readonly RawLog[], payer?: string | null): SettledTransfer | null {
  for (const log of logs) {
    if (!log.topics.length) continue;
    try {
      const ev = decodeEventLog({ abi: TRANSFER, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
      if (ev.eventName !== "Transfer") continue;
      if (payer && ev.args.from.toLowerCase() !== payer.toLowerCase()) continue;
      return { from: ev.args.from, to: ev.args.to, value: ev.args.value, token: log.address, txHash: tx.hash };
    } catch { /* not a Transfer */ }
  }
  if (tx.value > 0n && tx.to) return { from: tx.from, to: tx.to, value: tx.value, token: null, txHash: tx.hash };
  return null;
}

/**
 * Which registered agent was paid? A receipt about the wrong agent is worse
 * than none, so this refuses to guess. The money decides first: an agent whose
 * declared wallet received it, then one whose owner did. A URL is only a
 * tie-breaker between those, because anyone can register a URL they do not run.
 * Two candidates left standing is ambiguous, and ambiguous is skipped.
 */
export function pickSeller(byAddress: SellerMatch[], byEndpoint: SellerMatch[] = []): { match: SellerMatch } | { skip: string } {
  const here = byAddress.filter((m) => m.chain === "base-sepolia");
  if (!here.length) return { skip: "the payee is not the wallet or owner of any agent on Base Sepolia, where receipts are written" };
  const wallets = here.filter((m) => m.matchedOn === "agentWallet");
  const pool = wallets.length ? wallets : here;
  const ids = [...new Set(pool.map((m) => m.agentId))];
  if (ids.length === 1) return { match: pool[0]! };
  const claimed = new Set(byEndpoint.filter((m) => m.chain === "base-sepolia").map((m) => m.agentId));
  const both = pool.filter((m) => claimed.has(m.agentId));
  if (new Set(both.map((m) => m.agentId)).size === 1) return { match: both[0]! };
  return { skip: `the payee is behind ${ids.length} agents (${pool.map((m) => m.ref).join(", ")}); not guessing which one did the work` };
}

export async function readTransfer(txHash: Hex, payer?: string | null, rpc: string = BASE_SEPOLIA.rpc): Promise<SettledTransfer> {
  const pub = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
  const rc = await pub.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
  if (rc.status !== "success") throw new Error(`settlement ${txHash} reverted`);
  const tx = await pub.getTransaction({ hash: txHash });
  const t = transferFrom({ from: tx.from, to: tx.to ?? null, value: tx.value, hash: txHash }, rc.logs as RawLog[], payer);
  if (!t) throw new Error(`settlement ${txHash} moved no value`);
  return t;
}

export interface ReceiptOptions {
  /** Signs the review: the buyer's own Base Sepolia key. Defaults to AGENT_EVM_PRIVATE_KEY. Never the seller's — the registry bars self-review, and so does Assay. */
  privateKey?: Hex;
  /** 0–100, the buyer's rating of the work. 100 means paid and delivered. */
  value?: number;
  text?: string;
  /** Where Assay lives. Defaults to ASSAY_URL, then the public deployment. */
  base?: string;
  fetch?: typeof fetch;
}

async function lookup(f: typeof fetch, base: string, q: Record<string, string>): Promise<SellerMatch[]> {
  const r = await f(`${base}/api/v1/lookup?${new URLSearchParams(q).toString()}`);
  if (!r.ok) throw new Error(`lookup HTTP ${r.status}`);
  return ((await r.json()) as { matches: SellerMatch[] }).matches;
}

/** After any settled payment on Base Sepolia: find the agent that was paid and write the receipt the payment earned. */
export async function receiptForSettlement(opts: ReceiptOptions & { txHash: Hex; payer?: string | null; resource?: string | null }): Promise<ReceiptOutcome> {
  const f = opts.fetch ?? fetch;
  const base = (opts.base ?? process.env.ASSAY_URL ?? "https://assay-dusky.vercel.app").replace(/\/$/, "");
  const proof = await readTransfer(opts.txHash, opts.payer);
  const byAddress = await lookup(f, base, { address: proof.to });
  const pick = pickSeller(byAddress, byAddress.length > 1 && opts.resource ? await lookup(f, base, { url: opts.resource }) : []);
  if ("skip" in pick) return { status: "skipped", reason: pick.skip };
  const w = await writeReceipt({
    agentId: BigInt(pick.match.agentId),
    value: opts.value ?? 100,
    endpoint: opts.resource ?? "",
    ...(opts.text ? { text: opts.text } : {}),
    proof: { fromAddress: proof.from, toAddress: proof.to, chainId: String(BASE_SEPOLIA.chainId), txHash: proof.txHash },
    tags: ["assay", "paid-job"],
  }, opts.privateKey);
  return { status: "written", ref: pick.match.ref, txHash: w.txHash, feedbackURI: w.feedbackURI, explorer: w.explorer, proof };
}

/**
 * Receipts as one line around any x402 fetch:
 *
 *   const pay = withAssayReceipts(wrapFetchWithPayment(fetch, client));
 *
 * After a paid response whose payment settled on Base Sepolia, the review is
 * written in the background and reported through onReceipt; `wait: true`
 * holds the response until it is on-chain. The response is never delayed or
 * altered otherwise — a receipt that fails must not fail the purchase.
 */
export function withAssayReceipts(
  paidFetch: typeof fetch,
  opts: ReceiptOptions & { onReceipt?: (o: ReceiptOutcome) => void; onError?: (e: Error) => void; wait?: boolean } = {},
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await paidFetch(input, init);
    const header = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
    if (!res.ok || !header) return res;
    let s: { success?: boolean; transaction?: string; network?: string; payer?: string };
    try { s = decodePaymentResponseHeader(header) as typeof s; } catch { return res; }
    if (!s.success || !s.transaction) return res;
    if (s.network !== "eip155:84532") {
      opts.onReceipt?.({ status: "skipped", reason: `settled on ${s.network ?? "an unknown network"}; receipts are written on Base Sepolia` });
      return res;
    }
    const resource = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const job = receiptForSettlement({ ...opts, txHash: s.transaction as Hex, payer: s.payer ?? null, resource })
      .then((o) => opts.onReceipt?.(o), (e) => opts.onError?.(e as Error));
    if (opts.wait) await job;
    return res;
  }) as typeof fetch;
}
