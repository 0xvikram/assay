import { wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";

/**
 * The reference paying agent. It does exactly one thing an agent about to pay
 * a counterparty should do: buy a verdict first. The client signs the payment
 * and nothing else — the facilitator submits and pays the network fee.
 */
const BASE = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
const ref = process.argv[2] ?? "base:25975";
const [chain, agentId] = ref.split(":");
const url = `${BASE}/api/v1/agents/${chain}/${agentId}`;

const accountId = process.env.HEDERA_AGENT_ACCOUNT_ID;
const key = process.env.HEDERA_AGENT_PRIVATE_KEY;
if (!accountId || !key) {
  console.error("HEDERA_AGENT_ACCOUNT_ID / HEDERA_AGENT_PRIVATE_KEY are not set.");
  process.exit(2);
}

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const b = (s: string) => `\x1b[1m${s}\x1b[0m`;

console.log(`\n  ${b("1. ask without paying")}  ${dim(url)}`);
const first = await fetch(url);
console.log(`     HTTP ${first.status}`);
if (first.status !== 402) {
  console.error(`     expected 402 Payment Required; got ${first.status}. Is the route gated and HEDERA_SERVICE_ACCOUNT_ID set on the server?`);
  process.exit(1);
}
// x402 v2 carries the requirements in the PAYMENT-REQUIRED header, base64 JSON.
const reqHeader = first.headers.get("payment-required");
if (!reqHeader) {
  console.error("     402 without a PAYMENT-REQUIRED header — not an x402 v2 response.");
  process.exit(1);
}
const required = JSON.parse(Buffer.from(reqHeader, "base64").toString("utf8")) as {
  accepts?: { network?: string; asset?: string; amount?: string; payTo?: string; extra?: { feePayer?: string } }[];
};
for (const a of required.accepts ?? []) {
  console.log(`     ${dim("accepts")} ${a.network}  asset ${a.asset}  amount ${a.amount}  payTo ${a.payTo}  feePayer ${a.extra?.feePayer ?? "-"}`);
}

console.log(`\n  ${b("2. sign a payment, retry")}  ${dim(`as ${accountId}`)}`);
const signer = createClientHederaSigner(accountId, PrivateKey.fromStringECDSA(key), { network: "hedera:testnet" });
const client = new x402Client().register("hedera:*", new ExactHederaScheme(signer));
const paidFetch = wrapFetchWithPayment(fetch, client);

const started = Date.now();
const res = await paidFetch(url);
console.log(`     HTTP ${res.status}  ${dim(`${Date.now() - started} ms`)}`);
if (res.status !== 200) {
  console.error(`     payment did not clear: ${await res.text()}`);
  process.exit(1);
}

const report = await res.json() as { assessment: { verdict: string; confidence: number; headline: string }; provenance: { deployment: string; block: number } };
console.log(`\n  ${b("3. the verdict we paid for")}`);
console.log(`     ${report.assessment.verdict}  ${dim(`confidence ${report.assessment.confidence}/100`)}`);
console.log(`     ${report.assessment.headline}`);
console.log(`     ${dim(`deployment ${report.provenance.deployment} · block ${report.provenance.block}`)}`);

const pr = res.headers.get("payment-response") ?? res.headers.get("PAYMENT-RESPONSE");
console.log(`\n  ${b("4. settlement")}`);
if (!pr) {
  console.log(`     ${dim("no PAYMENT-RESPONSE header — settlement is async on Hedera; check the service account on HashScan")}`);
} else {
  const s = decodePaymentResponseHeader(pr) as { success?: boolean; transaction?: string; network?: string; payer?: string };
  console.log(`     success ${s.success}  network ${s.network}  payer ${s.payer ?? accountId}`);
  if (s.transaction) {
    console.log(`     tx ${s.transaction}`);
    console.log(`     https://hashscan.io/testnet/transaction/${encodeURIComponent(s.transaction)}`);
  }
}
console.log("");
