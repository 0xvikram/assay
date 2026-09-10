import { privateKeyToAccount } from "viem/accounts";
import { assay, resolveChain } from "../src/engine/assay";
import { fetchFeedbackFrom } from "../src/engine/graph/queries";
import { tagFeedback } from "../src/agent/respond";
import { BASE_SEPOLIA } from "../src/agent/receipt";

/**
 * Write Assay's finding onto the fake reviews themselves.
 *
 *   npm run tag:farm -- base-sepolia:2851 [--limit 3] [--dry-run]
 *
 * It tags only what Assay has itself found to be manufactured, only the
 * dominant reviewer's latest entries, and never the same entry twice. Base
 * Sepolia only: the registry contracts are per chain, and mainnet is out of
 * scope for now.
 */
const args = process.argv.slice(2);
const ref = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--limit") ?? "base-sepolia:2851";
const li = args.indexOf("--limit");
const limit = Math.max(1, Math.min(10, li >= 0 ? Number(args[li + 1]) || 3 : 3));
const dryRun = args.includes("--dry-run");
const [chainKey, agentId] = ref.split(":");

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const b = (s: string) => `\x1b[1m${s}\x1b[0m`;

if (chainKey !== "base-sepolia" || !agentId) {
  console.error(`  Tagging writes to the ERC-8004 registry on Base Sepolia only; got "${ref}".`);
  process.exit(2);
}
const key = process.env.SERVICE_EVM_PRIVATE_KEY as `0x${string}` | undefined;
if (!key) { console.error("  SERVICE_EVM_PRIVATE_KEY is not set."); process.exit(2); }
const responder = privateKeyToAccount(key).address.toLowerCase();

console.log(`\n  ${b("1. read the agent")}  ${dim(ref)}`);
const report = await assay(ref);
const a = report.assessment;
const s = report.signals;
console.log(`     ${a.verdict}  ${dim(a.headline)}`);
if (a.verdict !== "WASH_REPUTATION_DETECTED" || !s.topReviewer) {
  console.log(`     ${dim("Assay tags only what it has found manufactured — nothing to do.")}`);
  process.exit(0);
}

const chain = resolveChain(chainKey);
const { data } = await fetchFeedbackFrom(chain, agentId, s.topReviewer, limit);
console.log(`\n  ${b("2. the entries")}  ${dim(`latest ${data.feedbacks.length} from ${s.topReviewer}`)}`);

const critical = a.findings.filter((f) => f.severity === "critical").map(({ code, statement, measured }) => ({ code, statement, measured }));
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

for (const fb of data.feedbacks) {
  const idx = BigInt(fb.feedbackIndex);
  if (fb.responses.some((r) => r.responder.toLowerCase() === responder)) {
    console.log(`     #${fb.feedbackIndex}  ${dim("already tagged by Assay — skipped")}`);
    continue;
  }
  const file = {
    type: "assay.response.v1",
    respondingAs: { agentRegistry: `eip155:${BASE_SEPOLIA.chainId}:${BASE_SEPOLIA.identity}`, agentId: Number(process.env.ASSAY_AGENT_ID ?? 9200), address: responder },
    subject: { agentRegistry: `eip155:${BASE_SEPOLIA.chainId}:${BASE_SEPOLIA.identity}`, agentId: Number(agentId), clientAddress: fb.clientAddress, feedbackIndex: Number(fb.feedbackIndex) },
    verdict: a.verdict,
    classification: "not-independent-evidence",
    statement: `In the latest ${s.sample} reviews of agent ${agentId}, ${pct(s.topReviewerShare)} were written by ${s.topReviewer} and ${pct(s.burstShare)} landed inside one 24-hour window. Assay does not count this review as independent evidence of the agent's work.`,
    findings: critical,
    provenance: { deployment: report.provenance.deployment, block: report.provenance.block, sampleCap: report.provenance.sampleCap, sampleTruncated: report.provenance.sampleTruncated, readAt: report.provenance.readAt },
    method: `https://assay-dusky.vercel.app/api/v1/agents/${ref.replace(":", "/")}`,
    note: "Assay can tag; it cannot revoke. Only the address that wrote a review can revoke it.",
  };
  const r = await tagFeedback({ agentId: BigInt(agentId), clientAddress: fb.clientAddress as `0x${string}`, feedbackIndex: idx, file, dryRun });
  console.log(r.simulated
    ? `     #${fb.feedbackIndex}  ${b("simulated OK")}  ${dim("no pin, no transaction")}`
    : `     #${fb.feedbackIndex}  ${b("tagged")}  ${r.explorer}\n              ${dim(r.responseURI ?? "")}`);
}
console.log("");
