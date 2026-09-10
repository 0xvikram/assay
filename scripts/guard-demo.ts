import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";
import { withAssayGuard, type GuardDecision } from "../src/guard";

/**
 * The guard end to end, wired the way any agent would wire it: one x402
 * client on Base Sepolia, one line to guard it, then two payments.
 *
 *   1. An endpoint whose payTo is the Base farm's registered wallet. The
 *      endpoint is a stand-in; the address and the verdict are real. The
 *      guard refuses before anything is signed.
 *   2. Assay's own paid route. Its payTo resolves to agent 9200, which is
 *      UNPROVEN — allowed under this policy — so the payment settles.
 */
const BASE = (process.env.ASSAY_URL ?? process.env.PUBLIC_BASE_URL ?? "https://assay-dusky.vercel.app").replace(/\/$/, "");
const key = process.env.AGENT_EVM_PRIVATE_KEY as `0x${string}` | undefined;
if (!key) { console.error("AGENT_EVM_PRIVATE_KEY is not set."); process.exit(2); }

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const b = (s: string) => `\x1b[1m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const grn = (s: string) => `\x1b[32m${s}\x1b[0m`;

const decisions: GuardDecision[] = [];
// Wherever a 402 offers several rails, take the one this client can pay on.
const client = new x402Client((_v, accepts) => accepts.find((a) => a.network === "eip155:84532") ?? accepts[0]!);
registerExactEvmScheme(client, { signer: privateKeyToAccount(key), networks: ["eip155:84532"] });
withAssayGuard(client, { base: BASE, onDecision: (d) => decisions.push(d) });
const pay = wrapFetchWithPayment(fetch, client);

async function attempt(label: string, url: string) {
  console.log(`\n  ${b(label)}\n     ${dim(url)}`);
  const at = decisions.length;
  try {
    const res = await pay(url);
    const d = decisions[at];
    if (d) console.log(`     guard       ${grn("ALLOWED")} — ${d.reason}`);
    console.log(`     HTTP ${res.status}`);
    const pr = res.headers.get("payment-response");
    if (pr) {
      const s = decodePaymentResponseHeader(pr) as { transaction?: string; network?: string };
      console.log(`     settled     ${s.network ?? ""} ${s.transaction ?? ""}`);
    }
    if (res.ok) console.log(`     paid for    ${((await res.json()) as { assessment?: { verdict?: string } }).assessment?.verdict ?? "?"}`);
  } catch (e) {
    const d = decisions[at];
    if (d?.action === "refuse") {
      console.log(`     guard       ${red("REFUSED")} — ${d.reason}`);
      console.log(`     ${dim(`payTo ${d.payTo} · checked ${d.checked.map((c) => `${c.ref} (${c.matchedOn})`).join(", ")}`)}`);
      console.log(`     ${dim("nothing was signed, so no authorization exists to be misused")}`);
    } else {
      console.log(`     error       ${(e as Error).message}`);
    }
  }
}

console.log(`\n  ${b("Assay guard")}  ${dim(`one line on an x402 client · checks against ${BASE}`)}`);
await attempt("1. pay an endpoint whose wallet belongs to the Base farm", `${BASE}/api/demo/counterparty?as=base:25975`);
await attempt("2. pay Assay itself for a verdict", `${BASE}/api/v1/agents/base/25975`);
console.log("");
