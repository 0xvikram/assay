import { compareMarket, SOURCES } from "../src/lending/index";

/**
 * The Graph Composable demo: one query shape across independent Messari
 * deployments, and a refusal whenever the versions say the numbers were not
 * derived the same way. Every line below is a live read.
 */
const asset = process.argv[2] ?? "USDC";
const PAIRS: [string, string][] = [
  ["compound-v3-ethereum", "spark-lend-ethereum"], // same schema AND methodology → compare for real
  ["aave-v3-ethereum", "spark-lend-ethereum"],     // same schema, methodology 1.1.0 vs 1.0.0 → refuse
  ["aave-v3-ethereum", "moonwell-base"],           // schema 3.1.0 vs 2.0.1 → refuse harder
];

const C = { dim: (s: string) => `\x1b[2m${s}\x1b[0m`, b: (s: string) => `\x1b[1m${s}\x1b[0m`,
  grn: (s: string) => `\x1b[32m${s}\x1b[0m`, yel: (s: string) => `\x1b[33m${s}\x1b[0m`, red: (s: string) => `\x1b[31m${s}\x1b[0m` };
const paint = (c: string) => (c === "COMPARABLE" ? C.grn : c === "REGISTRY_DRIFT" ? C.red : C.yel)(c);

console.log(`\n  ${C.b(`Lending evidence · ${asset}`)}  ${C.dim(`${SOURCES.filter(s => s.healthy).length} servable of ${SOURCES.length} registered sources`)}\n`);

for (const [a, b] of PAIRS) {
  try {
    const r = await compareMarket(a, b, asset);
    const c = r.comparison;
    console.log(`  ${C.b(`${a} ↔ ${b}`)}`);
    console.log(`  ${paint(c.comparability)} ${C.dim("·")} ${c.reconciliation}`);
    console.log(`  ${c.statement}`);
    for (const d of c.deltas) {
      const mark = d.withinTolerance ? C.grn("✓") : C.red("✗");
      console.log(`    ${mark} ${d.field.padEnd(21)} ${String(d.a).slice(0, 12).padEnd(14)} ${String(d.b).slice(0, 12).padEnd(14)} ${C.dim(`${(d.relDiff * 100).toFixed(1)}%`)}`);
    }
    console.log(C.dim(`    read at ${r.provenance.map((p) => `${p.source} block ${p.block}`).join(" · ")}`));
    console.log(C.dim(`    deployments ${r.provenance.map((p) => p.deployment.slice(0, 14) + "…").join(" · ")}\n`));
  } catch (e) {
    console.log(`  ${C.red("refused")} ${a} ↔ ${b}: ${(e as Error).message}\n`);
  }
}

const unhealthy = SOURCES.filter((s) => !s.healthy);
if (unhealthy.length) {
  console.log(C.dim("  not servable — the engine refuses rather than guess:"));
  for (const s of unhealthy) console.log(C.dim(`    ${s.key.padEnd(22)} ${s.unhealthyReason ?? ""}`));
  console.log("");
}
