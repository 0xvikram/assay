import { GatewayClient } from "@circle-fin/x402-batching/client";
import { decide, loadMandate } from "./mandate";

/**
 * The same purchase on the second rail. Arc payments are signed off-chain and
 * batched by Circle Gateway, so the agent pays no gas; a one-time deposit
 * funds its Gateway balance. Nothing here submits a transaction either.
 */
const BASE = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
const args = process.argv.slice(2);
const ref = args.find((a) => !a.startsWith("--")) ?? "base:25975";
const depositIdx = args.indexOf("--deposit");
const deposit = depositIdx >= 0 ? args[depositIdx + 1] : undefined;
const [chain, agentId] = ref.split(":");
const url = `${BASE}/api/v1/agents/${chain}/${agentId}`;

const key = process.env.AGENT_EVM_PRIVATE_KEY as `0x${string}` | undefined;
if (!key) { console.error("AGENT_EVM_PRIVATE_KEY is not set."); process.exit(2); }

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const b = (s: string) => `\x1b[1m${s}\x1b[0m`;
const mandate = loadMandate();

const client = new GatewayClient({ chain: "arcTestnet", privateKey: key })
  .onBeforePaymentCreation(async ({ selectedRequirements: r }) => {
    // USDC has 6 decimals; the mandate's Arc ceiling is $0.05 per payment, stated in atomic units.
    if (BigInt(r.amount) > 50_000n) return { abort: true, reason: `payment ${r.amount} USDC-atomic exceeds the $0.05 per-payment cap` };
  });

if (deposit) {
  console.log(`\n  ${b("0. deposit")}  ${deposit} USDC into the Gateway balance ${dim("(one-time)")}`);
  await client.deposit(deposit);
}

console.log(`\n  ${b("1. pay on Arc")}  ${dim(url)}`);
const started = Date.now();
const res = await client.pay<{ assessment: { verdict: string; confidence: number; headline: string }; provenance: { deployment: string; block: number } }>(url);
console.log(`     ${dim(`${Date.now() - started} ms`)}`);
const { data, amount, formattedAmount, transaction } = res;

console.log(`\n  ${b("2. the verdict we paid for")}`);
console.log(`     ${data.assessment.verdict}  ${dim(`confidence ${data.assessment.confidence}/100`)}`);
console.log(`     ${data.assessment.headline}`);
console.log(`     ${dim(`deployment ${data.provenance.deployment} · block ${data.provenance.block}`)}`);

console.log(`\n  ${b("3. settlement")}`);
console.log(`     paid ${formattedAmount} USDC (${amount} atomic) · tx ${transaction}`);
console.log(`     ${dim("batched by Circle Gateway; https://testnet.arcscan.app/tx/" + transaction)}`);

const d = decide(mandate, data.assessment.verdict as never, process.env.INTENDED_SPEND ?? "10000000");
console.log(`\n  ${b("4. decision under the mandate")}  ${b(d.action.toUpperCase())} — ${d.why}\n`);
