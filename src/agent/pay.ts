import { wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { decide, enforce, loadMandate, type Ledger } from "./mandate";
import { writeReceipt } from "./receipt";

/**
 * The reference paying agent. It does exactly one thing an agent about to pay
 * a counterparty should do: buy a verdict first. The client signs the payment
 * and nothing else — the facilitator submits and pays the network fee.
 */
const BASE = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
const args = process.argv.slice(2);
const ref = args.find((a) => !a.startsWith("--")) ?? "base:25975";
const wantReceipt = args.includes("--receipt");
/** What the agent intends to spend with this counterparty if the verdict allows it, in tinybar. */
const intendedSpend = process.env.INTENDED_SPEND ?? "10000000";
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
const mandate = loadMandate();
const ledger: Ledger = { spent: 0n, payments: [] };
const signer = createClientHederaSigner(accountId, PrivateKey.fromStringECDSA(key), { network: "hedera:testnet" });
const client = enforce(new x402Client().register("hedera:*", new ExactHederaScheme(signer)), mandate, ledger);
const paidFetch = wrapFetchWithPayment(fetch, client);
console.log(`     ${dim(`mandate: per-payment cap ${mandate.maxPaymentAmount}, run cap ${mandate.maxTotalAmount}, expires ${mandate.expiresAt}`)}`);

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

const pr = res.headers.get("payment-response");
console.log(`\n  ${b("4. settlement")}`);
type Settlement = { success?: boolean; transaction?: string; network?: string; payer?: string };
let settlement: Settlement | null = null;
if (!pr) {
  console.log(`     ${dim("no PAYMENT-RESPONSE header — settlement is async on Hedera; check the service account on HashScan")}`);
} else {
  settlement = decodePaymentResponseHeader(pr) as Settlement;
  console.log(`     success ${settlement?.success}  network ${settlement?.network}  payer ${settlement?.payer ?? accountId}`);
  if (settlement?.transaction) {
    console.log(`     tx ${settlement.transaction}`);
    console.log(`     https://hashscan.io/testnet/transaction/${encodeURIComponent(settlement.transaction)}`);
  }
}
const paid = ledger.payments[0];
console.log(`     ${dim(`paid ${paid?.amount ?? "?"} ${paid?.asset ?? ""} on ${paid?.network ?? ""} · run total ${ledger.spent}`)}`);

// ---- the action trail: intent → evidence bought → decision → next action ----
const decision = decide(mandate, report.assessment.verdict as never, intendedSpend);
console.log(`\n  ${b("5. decision under the mandate")}`);
console.log(`     intent      pay ${ref} up to ${intendedSpend} tinybar`);
console.log(`     evidence    ${report.assessment.verdict} (${paid?.amount ?? "?"} ${paid?.asset ?? ""} · ${settlement?.transaction ?? "settling"})`);
console.log(`     decision    ${b(decision.action.toUpperCase())} — ${decision.why}`);

// ---- the receipt: the review that proves it was paid for -------------------
if (wantReceipt) {
  console.log(`\n  ${b("6. write the receipt")}`);
  const assayId = process.env.ASSAY_AGENT_ID;
  const payTo = process.env.HEDERA_SERVICE_ACCOUNT_ID ?? "";
  if (!assayId) {
    console.log(`     ${dim("ASSAY_AGENT_ID not set — run npm run register:self first")}`);
  } else if (!settlement?.transaction) {
    console.log(`     ${dim("no settlement transaction yet; nothing to prove")}`);
  } else {
    const r = await writeReceipt({
      agentId: BigInt(assayId),
      value: 100,
      endpoint: url,
      tool: "assay_agent",
      text: `Paid ${paid?.amount} tinybar for a verdict on ${ref}: ${report.assessment.verdict}.`,
      proof: { fromAddress: accountId, toAddress: payTo, chainId: "296", txHash: settlement.transaction },
    });
    console.log(`     feedback file ${r.feedbackURI}`);
    console.log(`     giveFeedback  ${r.explorer}`);
    console.log(`     ${dim(`now: npm run assay -- base-sepolia:${assayId}  → the review carries proofOfPaymentTxHash`)}`);
  }
}
console.log("");
