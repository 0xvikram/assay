import { readFileSync } from "node:fs";
import { assay, type AssayReport } from "./engine/assay";
import { resolveEndpoint } from "./engine/resolve";
import { corroborate } from "./engine/corroborate";

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

const USAGE = `usage: npm run assay -- <chain>:<agentId> [--json]
       npm run assay -- --resolve <endpoint-url> [--json]
       npm run assay -- --corroborate <owner-address | chain:agentId> [--json]
       npm run assay -- --fixture <file.json>
       e.g. npm run assay -- base:25975`;

const args = process.argv.slice(2);
const json = args.includes("--json");
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const ref = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

const rule = (label: string) => C.dim(`  ── ${label} ${"─".repeat(Math.max(1, 55 - label.length - 4))}`);
const row = (k: string, v: string) => console.log(`  ${C.dim(k.padEnd(26))}${v}`);

function printReport(r: AssayReport, source: string | null) {
  const { agent, assessment: a, signals: s, provenance: p } = r;
  const paint = VERDICT_COLOR[a.verdict];

  console.log("");
  if (source) console.log(`  ${C.yel(C.b("source: fixture"))}  ${C.dim(source)}  ${C.dim("— a pinned snapshot, not a live read")}\n`);
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
    console.log(rule(a.verdict === "VERIFIED" ? "to raise confidence" : "to reach VERIFIED"));
    for (const step of a.nextSteps) console.log(`  ${C.dim("→")} ${step}`);
  }

  console.log("");
  console.log(rule("signals"));
  row("reviews examined", `${s.sample}${s.revoked ? ` (+${s.revoked} revoked)` : ""}`);
  row("distinct reviewers", String(s.distinctReviewers));
  row("top reviewer share", `${(s.topReviewerShare * 100).toFixed(1)}%`);
  row("payment-proof coverage", `${(s.paymentProofCoverage * 100).toFixed(1)}%  (${s.paidFeedback} paid)`);
  row("independent paid reviewers", String(s.paidReviewers));
  row("validations", String(s.validations));
  row("registration completeness", `${(s.registrationCompleteness * 100).toFixed(0)}%`);

  console.log("");
  console.log(rule("provenance"));
  row("chain", `${p.chain} (${p.chainId})`);
  row("deployment", p.deployment);
  row("block", `${p.block}${p.blockTime ? `  ${p.blockTime}` : ""}`);
  row("indexing errors", String(p.hasIndexingErrors));
  row("sample", p.sampleTruncated ? `${p.sampleCap} (truncated)` : `complete`);
  row("read in", source ? `${C.yel("fixture")} (originally ${p.latencyMs} ms at ${p.readAt})` : `${p.latencyMs} ms`);
  console.log("");
}

try {
  const fixture = flag("--fixture");
  const resolve = flag("--resolve");
  const owner = flag("--corroborate");

  if (fixture) {
    const r = JSON.parse(readFileSync(fixture, "utf8")) as AssayReport;
    if (json) console.log(JSON.stringify({ source: "fixture", file: fixture, ...r }, null, 2));
    else printReport(r, fixture);
    process.exit(0);
  }

  if (resolve) {
    const r = await resolveEndpoint(resolve);
    if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
    console.log("");
    console.log(`  ${C.b(r.input)}`);
    console.log(`  ${C.dim(`asked ${r.chainsQueried.length} chains for ${r.candidates.length} spellings`)}`);
    console.log("");
    if (!r.matches.length) console.log(`  ${C.yel("no registered agent claims this endpoint")}`);
    for (const m of r.matches) {
      console.log(`  ${C.grn("✓")} ${C.b(`${m.chain.key}:${m.agent.agentId}`)}  ${m.agent.registrationFile?.name ?? C.dim("(unnamed)")}`);
      console.log(`    ${C.dim(`${m.matchedOn} = ${m.matchedValue} · owner ${m.agent.owner}`)}`);
    }
    for (const t of r.truncated) console.log(`  ${C.yel("!")} ${t}: more than 20 agents claim this endpoint — shown the first 20. One endpoint, many registrations: treat identity as the agent id, not the URL.`);
    for (const f of r.failures) console.log(`  ${C.red("✗")} ${f.chain}: ${C.dim(f.error)}`);
    console.log("");
    process.exit(0);
  }

  if (owner) {
    const r = await corroborate(owner);
    if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
    console.log("");
    console.log(`  ${C.b(r.owner)}  ${C.dim(`present on ${r.chains.length} of ${r.chainsQueried.length} chains`)}`);
    console.log("");
    for (const p of r.chains) {
      console.log(`  ${C.b(p.chain)} ${C.dim(`(${p.chainId})`)}`);
      for (const a of p.agents) {
        const v = a.verdict ? VERDICT_COLOR[a.verdict](a.verdict) : C.red(`error: ${a.error}`);
        console.log(`    ${a.id.padEnd(16)} ${(a.name ?? C.dim("(unnamed)")).padEnd(32)} ${v}${a.confidence != null ? C.dim(` ${a.confidence}/100`) : ""}`);
      }
    }
    if (r.findings.length) {
      console.log("");
      for (const f of r.findings) {
        console.log(`  ${SEV[f.severity]} ${f.statement}`);
        console.log(`    ${C.dim(f.measured)}`);
      }
    }
    for (const f of r.failures) console.log(`  ${C.red("✗")} ${f.chain}: ${C.dim(f.error)}`);
    console.log("");
    process.exit(0);
  }

  if (!ref) {
    console.error(USAGE);
    process.exit(2);
  }

  const r = await assay(ref);
  if (json) console.log(JSON.stringify(r, null, 2));
  else printReport(r, null);
  process.exit(0);
} catch (err) {
  console.error(`\n  ${C.red("error")}  ${(err as Error).message}\n`);
  process.exit(1);
}
