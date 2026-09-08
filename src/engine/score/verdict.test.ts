import { test } from "node:test";
import assert from "node:assert/strict";
import type { RawAgent, RawFeedback } from "../graph/queries";
import { computeSignals } from "./signals";
import { assess, THRESHOLDS } from "./verdict";

const OWNER = "0x1111111111111111111111111111111111111111";
const T0 = 1_750_000_000;

function review(i: number, opts: Partial<RawFeedback> & { paidTx?: string } = {}): RawFeedback {
  const { paidTx, ...rest } = opts;
  return {
    id: `f${i}`,
    clientAddress: `0x${(i + 2).toString(16).padStart(40, "0")}`,
    value: "80",
    tag1: null,
    tag2: null,
    isRevoked: false,
    createdAt: String(T0 + i * 3 * 86_400),
    feedbackFile: paidTx
      ? { proofOfPaymentTxHash: paidTx, proofOfPaymentChainId: "296", proofOfPaymentFromAddress: null, mcpTool: "check", text: null }
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
