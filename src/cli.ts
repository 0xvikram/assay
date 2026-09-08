import { assay } from "./assay.js";

const C = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  b: (s: string) => `\x1b[1m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yel: (s: string) => `\x1b[33m${s}\x1b[0m`,
  grn: (s: string) => `\x1b[32m${s}\x1b[0m`,
};

const VERDICT_COLOR = {
  VERIFIED: C.grn,
  UNPROVEN: C.yel,
  WASH_REPUTATION_DETECTED: C.red,
} as const;

const SEV = { critical: C.red("✗"), warning: C.yel("!"), info: C.dim("·") } as const;

const args = process.argv.slice(2);
const json = args.includes("--json");
const ref = args.find((a) => !a.startsWith("--"));

if (!ref) {
  console.error("usage: npm run assay -- <chain>:<agentId> [--json]\n       e.g. npm run assay -- base:1247");
  process.exit(2);
}

try {
  const r = await assay(ref);

  if (json) {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  }

  const { agent, assessment: a, signals: s, provenance: p } = r;
  const paint = VERDICT_COLOR[a.verdict];

  console.log("");
  console.log(`  ${C.b(agent.name ?? "(unnamed agent)")}  ${C.dim(agent.id)}`);
  console.log(`  ${C.dim(`owner ${agent.owner}`)}`);
  console.log("");
  console.log(`  ${paint(C.b(a.verdict))}   ${C.dim(`confidence ${a.confidence}/100`)}`);
  console.log(`  ${a.headline}`);
  console.log("");

  for (const f of a.findings) {
    console.log(`  ${SEV[f.severity]} ${f.statement}`);
    console.log(`    ${C.dim(f.measured)}`);
  }

  if (a.nextSteps.length) {
    console.log("");
    const label = a.verdict === "VERIFIED" ? "to raise confidence" : "to reach VERIFIED";
    console.log(C.dim(`  ── ${label} ${"─".repeat(Math.max(1, 55 - label.length - 4))}`));
    for (const step of a.nextSteps) console.log(`  ${C.dim("→")} ${step}`);
  }

  console.log("");
  console.log(C.dim("  ── signals ────────────────────────────────────────────"));
  const row = (k: string, v: string) => console.log(`  ${C.dim(k.padEnd(26))}${v}`);
  row("reviews examined", `${s.sample}${s.revoked ? ` (+${s.revoked} revoked)` : ""}`);
  row("distinct reviewers", String(s.distinctReviewers));
  row("top reviewer share", `${(s.topReviewerShare * 100).toFixed(1)}%`);
  row("payment-proof coverage", `${(s.paymentProofCoverage * 100).toFixed(1)}%  (${s.paidFeedback} paid)`);
  row("independent paid reviewers", String(s.paidReviewers));
  row("validations", String(s.validations));
  row("registration completeness", `${(s.registrationCompleteness * 100).toFixed(0)}%`);

  console.log("");
  console.log(C.dim("  ── provenance ─────────────────────────────────────────"));
  row("chain", `${p.chain} (${p.chainId})`);
  row("deployment", p.deployment);
  row("block", `${p.block}${p.blockTime ? `  ${p.blockTime}` : ""}`);
  row("indexing errors", String(p.hasIndexingErrors));
  row("sample", p.sampleTruncated ? `${p.sampleCap} (truncated)` : `complete`);
  row("read in", `${p.latencyMs} ms`);
  console.log("");
} catch (err) {
  console.error(`\n  ${C.red("error")}  ${(err as Error).message}\n`);
  process.exit(1);
}
