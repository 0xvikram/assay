import { test } from "node:test";
import assert from "node:assert/strict";
import type { RawAgent, RawFeedback } from "../graph/queries";
import { computeSignals } from "./signals";
import { assess, THRESHOLDS } from "./verdict";

const OWNER = "0x1111111111111111111111111111111111111111";
const T0 = 1_750_000_000;

function review(i: number, opts: Partial<RawFeedback> & { paidTx?: string; payer?: string; payee?: string } = {}): RawFeedback {
  const { paidTx, payer, payee, ...rest } = opts;
  return {
    id: `f${i}`,
    clientAddress: `0x${(i + 2).toString(16).padStart(40, "0")}`,
    value: "80",
    tag1: null,
    tag2: null,
    isRevoked: false,
    createdAt: String(T0 + i * 3 * 86_400),
    feedbackFile: paidTx
      ? { proofOfPaymentTxHash: paidTx, proofOfPaymentChainId: "296", proofOfPaymentFromAddress: payer ?? null, proofOfPaymentToAddress: payee ?? null, mcpTool: "check", text: null }
      : null,
    ...rest,
  };
}

function agent(feedback: RawFeedback[], overrides: Partial<RawAgent> = {}): RawAgent {
  return {
    id: "8453:1", chainId: "8453", agentId: "1", owner: OWNER, agentWallet: null,
    createdAt: String(T0), lastActivity: null, totalFeedback: String(feedback.length),
    registrationFile: { name: "Test", description: "d", active: true, x402Support: true, supportedTrusts: ["reputation"],
      mcpEndpoint: "https://x", mcpTools: ["check"], a2aEndpoint: null, webEndpoint: null, ens: null, did: null },
    validations: [], feedback, ...overrides,
  };
}

/** One address, one score, one day. The Base farm in miniature. */
function farm(n = 200): RawFeedback[] {
  return Array.from({ length: n }, (_, i) =>
    review(i, { clientAddress: "0x00000000000000000000000000000000000000ff", value: "100", createdAt: String(T0 + i) }));
}

test("a single-source burst of identical unpaid scores is wash reputation", () => {
  const a = assess(computeSignals(agent(farm())));
  assert.equal(a.verdict, "WASH_REPUTATION_DETECTED");
  assert.equal(a.confidence, 0);
  assert.ok(a.findings.some((f) => f.code === "SINGLE_SOURCE_REPUTATION" && f.severity === "critical"));
  assert.ok(a.nextSteps.some((s) => s.includes("payment-backed")));
});

test("many genuine but unpaid reviewers is unproven, with a priced path to VERIFIED", () => {
  // Real people disagree a little; identical scores from everyone is itself a farm tell.
  const a = assess(computeSignals(agent(Array.from({ length: 120 }, (_, i) => review(i, { value: String(60 + (i % 5) * 10) })))));
  assert.equal(a.verdict, "UNPROVEN");
  assert.match(a.nextSteps[0]!, new RegExp(`^${THRESHOLDS.minPaidFeedback} more payment-backed`));
  assert.match(a.nextSteps[0]!, new RegExp(`${THRESHOLDS.minPaidReviewers} more independent payer`));
});

test("payment-backed evidence outranks an attacker's free reviews", () => {
  const paid = [0, 1, 2, 0, 1, 2].map((payer, i) =>
    review(1000 + i, { clientAddress: `0x${(payer + 0xa0).toString(16).padStart(40, "0")}`, paidTx: `0xtx${i}` }));
  const a = assess(computeSignals(agent([...farm(), ...paid])));
  assert.equal(a.verdict, "VERIFIED");
  assert.ok(a.findings.some((f) => f.code === "UNPAID_NOISE_OUTRANKED"));
  assert.ok(a.findings.every((f) => f.severity !== "critical"));
  assert.ok(a.confidence > 0 && a.confidence <= 50, `confidence ${a.confidence} should be halved`);
});

test("self-issued feedback stays damning even when paid reviews exist", () => {
  const paid = [0, 1, 2, 0, 1, 2].map((payer, i) =>
    review(1000 + i, { clientAddress: `0x${(payer + 0xa0).toString(16).padStart(40, "0")}`, paidTx: `0xtx${i}` }));
  const self = [review(5000, { clientAddress: OWNER })];
  const a = assess(computeSignals(agent([...paid, ...self])));
  assert.equal(a.verdict, "WASH_REPUTATION_DETECTED");
  assert.match(a.nextSteps[0]!, /revokeFeedback/);
});

test("a paid population dominated by one payer does not earn VERIFIED", () => {
  // 11 of 20 from one payer: over the paid-concentration ceiling (50%) but under
  // the single-source wash line (60%), so this is unproven rather than fraud.
  const paid = Array.from({ length: 20 }, (_, i) =>
    review(1000 + i, { clientAddress: i < 11 ? "0x00000000000000000000000000000000000000a0" : `0x${(i + 0xb0).toString(16).padStart(40, "0")}`, paidTx: `0xtx${i}` }));
  const a = assess(computeSignals(agent(paid)));
  assert.equal(a.verdict, "UNPROVEN");
  assert.ok(a.nextSteps.some((s) => s.startsWith("Spread the paid reviews")));
});

test("one payment-backed review from one payer is unproven, not wash", () => {
  // Assay's own first receipt: a new agent with a single paid review.
  const a = assess(computeSignals(agent([review(1, { paidTx: "0xtx1" })])));
  assert.equal(a.verdict, "UNPROVEN");
  assert.ok(a.findings.some((f) => f.code === "THIN_SAMPLE"));
  assert.ok(!a.findings.some((f) => f.severity === "critical"));
});

const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;
const WALLET = addr(0xbeef);

test("an agent paying itself is not proof of payment, and it stays damning", () => {
  const genuine = [0, 1, 2, 0, 1, 2].map((p, i) => review(2000 + i, { clientAddress: addr(0xc0 + p), paidTx: `0xg${i}`, payer: addr(0xd0 + p) }));
  const bought = [review(3000, { clientAddress: addr(0xe1), paidTx: "0xself", payer: OWNER })];
  const a = assess(computeSignals(agent([...genuine, ...bought])));
  assert.equal(a.verdict, "WASH_REPUTATION_DETECTED");
  assert.ok(a.findings.some((f) => f.code === "SELF_PAID_PROOF" && f.severity === "critical"));
  assert.ok(a.nextSteps.some((x) => x.includes("never proof")));
});

test("one transaction cited by many reviews is counted once", () => {
  const fb = Array.from({ length: 5 }, (_, i) => review(4000 + i, { clientAddress: addr(0xa0 + i), paidTx: "0xsame", payer: addr(0xa0 + i) }));
  const s = computeSignals(agent(fb));
  assert.equal(s.paidFeedback, 1);
  assert.equal(s.reusedProofs, 4);
  const a = assess(s);
  assert.equal(a.verdict, "UNPROVEN");
  assert.ok(a.findings.some((f) => f.code === "REUSED_PAYMENT_PROOF"));
});

test("many reviewers paid for by one wallet do not earn VERIFIED", () => {
  const ring = Array.from({ length: 6 }, (_, i) => review(5000 + i, { clientAddress: addr(0xb0 + i), paidTx: `0xr${i}`, payer: addr(0x999) }));
  const s = computeSignals(agent(ring));
  assert.equal(s.paidReviewers, 6);
  assert.equal(s.paidPayers, 1);
  const a = assess(s);
  assert.equal(a.verdict, "UNPROVEN");
  assert.ok(a.findings.some((f) => f.code === "SINGLE_PAYER_REVIEWS"));
  assert.ok(a.nextSteps.some((x) => x.startsWith("Spread who pays")));
});

test("paying yourself once does not soften a burst", () => {
  const a = assess(computeSignals(agent([...farm(), review(6000, { clientAddress: addr(0xe2), paidTx: "0xonce", payer: OWNER })])));
  assert.equal(a.verdict, "WASH_REPUTATION_DETECTED");
  assert.ok(a.findings.some((f) => f.code === "BURST_TIMED_REVIEWS" && f.severity === "critical"));
});

test("a proof paying someone else is not counted, but a cross-chain recipient is fine", () => {
  const elsewhere = [0, 1, 2, 3, 4, 5].map((p) => review(7000 + p, { clientAddress: addr(0xf0 + p), paidTx: `0xe${p}`, payer: addr(0xf0 + p), payee: addr(0x1234) }));
  const s1 = computeSignals(agent(elsewhere, { agentWallet: WALLET }));
  assert.equal(s1.proofsToOthers, 6);
  assert.equal(assess(s1).verdict, "UNPROVEN");
  const hedera = [0, 1, 2, 3, 4, 5].map((p) => review(8000 + p, { clientAddress: addr(0xf0 + p), paidTx: `0xh${p}`, payer: addr(0xf0 + p), payee: "0.0.10417408" }));
  const s2 = computeSignals(agent(hedera, { agentWallet: WALLET }));
  assert.equal(s2.proofsToOthers, 0);
  assert.equal(assess(s2).verdict, "VERIFIED");
});

const val = (validator: string, response: number | null) => ({
  id: `v-${validator}-${response}`, validatorAddress: validator, response,
  status: response === null ? "PENDING" : "RESPONDED", tag: null, createdAt: String(T0),
});
const paidTrio = () => [0, 1, 2, 0, 1, 2].map((p, i) => review(9000 + i, { clientAddress: addr(0xa0 + p), paidTx: `0xv${i}`, payer: addr(0xa0 + p) }));

test("an attestation from the agent's own wallet is reported and not counted", () => {
  const s = computeSignals(agent([], { validations: [val(OWNER, 100)] }));
  assert.equal(s.selfValidated, 1);
  assert.equal(s.independentValidations, 0);
  const a = assess(s);
  assert.ok(a.findings.some((f) => f.code === "SELF_VALIDATED"));
  assert.ok(a.findings.some((f) => f.code === "NO_VALIDATION" && /all from the agent itself/.test(f.measured)));
});

test("an independent attestation is evidence and never moves confidence", () => {
  const without = assess(computeSignals(agent(paidTrio())));
  const withIt = assess(computeSignals(agent(paidTrio(), { validations: [val(addr(0x7777), 95)] })));
  assert.equal(withIt.verdict, "VERIFIED");
  assert.equal(withIt.confidence, without.confidence);
  assert.ok(withIt.findings.some((f) => f.code === "INDEPENDENTLY_VALIDATED"));
  assert.ok(!withIt.findings.some((f) => f.code === "NO_VALIDATION"));
});

test("an independent validator's failing score is flagged", () => {
  const a = assess(computeSignals(agent(paidTrio(), { validations: [val(addr(0x7777), 20), val(addr(0x8888), null)] })));
  assert.ok(a.findings.some((f) => f.code === "VALIDATION_FAILED"));
  assert.ok(a.findings.some((f) => f.code === "INDEPENDENTLY_VALIDATED" && /1 pending/.test(f.measured)));
});
