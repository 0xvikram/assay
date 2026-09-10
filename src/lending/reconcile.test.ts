import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcile, readingFor, TOLERANCE } from "./reconcile";
import type { LendingSource } from "./registry";
import type { RawMarket, RawProtocol } from "./queries";

const src = (key: string, schema: string, meth: string): LendingSource => ({
  key, protocol: "P", network: "MAINNET", subgraphId: "x", healthy: true,
  schemaVersion: schema, methodologyVersion: meth,
});

const proto = (schema: string, meth: string, network = "MAINNET"): RawProtocol => ({
  id: "p", name: "P", network, type: "LENDING",
  schemaVersion: schema, subgraphVersion: "1.0.0", methodologyVersion: meth, totalValueLockedUSD: "1",
});

const market = (over: Partial<RawMarket> = {}): RawMarket => ({
  id: "m", name: "USDC market", isActive: true, canBorrowFrom: true,
  maximumLTV: "75", liquidationThreshold: "80",
  totalValueLockedUSD: "1000", totalDepositBalanceUSD: "1000", totalBorrowBalanceUSD: "500",
  inputToken: { symbol: "USDC", decimals: 6 },
  rates: [{ rate: "4.0", side: "LENDER", type: "VARIABLE" }],
  ...over,
});

const read = (key: string, schema: string, meth: string, m: RawMarket | null = market()) =>
  readingFor(src(key, schema, meth), [proto(schema, meth)], m ? [m] : [], "USDC");

test("different schema versions are never compared", () => {
  const c = reconcile(read("a", "3.1.0", "1.0.0"), read("b", "2.0.1", "1.0.0"), "USDC");
  assert.equal(c.comparability, "SCHEMA_MISMATCH");
  assert.equal(c.reconciliation, "NOT_ATTEMPTED");
  assert.equal(c.deltas.length, 0);
});

test("same schema but different methodology is refused, and says so", () => {
  const c = reconcile(read("a", "3.1.0", "1.1.0"), read("b", "3.1.0", "1.0.0"), "USDC");
  assert.equal(c.comparability, "METHODOLOGY_MISMATCH");
  assert.equal(c.reconciliation, "NOT_ATTEMPTED");
  assert.match(c.statement, /1\.1\.0/);
  assert.match(c.statement, /invent agreement/);
});

test("matching versions and matching numbers agree", () => {
  const c = reconcile(read("a", "3.1.0", "1.0.0"), read("b", "3.1.0", "1.0.0"), "USDC");
  assert.equal(c.comparability, "COMPARABLE");
  assert.equal(c.reconciliation, "AGREE");
  assert.ok(c.deltas.every((d) => d.withinTolerance));
});

test("a difference beyond tolerance is a disagreement, not an average", () => {
  const b = read("b", "3.1.0", "1.0.0", market({ rates: [{ rate: "8.0", side: "LENDER", type: "VARIABLE" }] }));
  const c = reconcile(read("a", "3.1.0", "1.0.0"), b, "USDC");
  assert.equal(c.reconciliation, "DISAGREE");
  assert.match(c.statement, /EVIDENCE_INCONSISTENT/);
  assert.ok(c.deltas.some((d) => d.field === "lenderRate" && !d.withinTolerance));
});

test("a difference inside tolerance still agrees", () => {
  const nudged = 4 * (1 + TOLERANCE / 2);
  const b = read("b", "3.1.0", "1.0.0", market({ rates: [{ rate: String(nudged), side: "LENDER", type: "VARIABLE" }] }));
  assert.equal(reconcile(read("a", "3.1.0", "1.0.0"), b, "USDC").reconciliation, "AGREE");
});

test("a subgraph that drifted from the registry blocks the comparison", () => {
  // registry says methodology 1.0.0; the subgraph now reports 1.1.0
  const drifted = readingFor(src("a", "3.1.0", "1.0.0"), [proto("3.1.0", "1.1.0")], [market()], "USDC");
  const c = reconcile(drifted, read("b", "3.1.0", "1.0.0"), "USDC");
  assert.equal(c.comparability, "REGISTRY_DRIFT");
  assert.match(c.statement, /registry expected/);
});

test("a missing market is reported, not silently treated as zero", () => {
  const c = reconcile(read("a", "3.1.0", "1.0.0"), read("b", "3.1.0", "1.0.0", null), "USDC");
  assert.equal(c.comparability, "COMPARABLE");
  assert.equal(c.reconciliation, "NOT_ATTEMPTED");
  assert.match(c.statement, /lists no USDC market/);
});
