import type { Signals } from "./signals.js";

export type Verdict = "VERIFIED" | "UNPROVEN" | "WASH_REPUTATION_DETECTED";

export interface Finding {
  code: string;
  severity: "critical" | "warning" | "info";
  statement: string;
  measured: string;
}

export interface Assessment {
  verdict: Verdict;
  /** 0..100. Only ever earned by payment-backed, independent reviews. */
  confidence: number;
  headline: string;
  findings: Finding[];
}

/**
 * Thresholds are stated here, in one place, because a score whose rules are
 * hidden is exactly the problem this service exists to fix.
 */
export const THRESHOLDS = {
  washTopReviewerShare: 0.60,
  concernTopReviewerShare: 0.40,
  minPaidReviewers: 3,
  minPaidFeedback: 5,
  maxPaidTopShare: 0.50,
  uniformSampleFloor: 10,
  burstShare: 0.80,
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function assess(s: Signals): Assessment {
  const f: Finding[] = [];

  // ---- critical: the signal is manufactured -------------------------------
  if (s.sample > 0 && s.topReviewerShare >= THRESHOLDS.washTopReviewerShare) {
    f.push({
      code: "SINGLE_SOURCE_REPUTATION",
      severity: "critical",
      statement: "One address wrote most of this agent's reputation.",
      measured: `${pct(s.topReviewerShare)} of ${s.sample} reviews from ${s.topReviewer}`,
    });
  }
  if (s.sample >= THRESHOLDS.uniformSampleFloor && s.distinctScoreValues <= 1 && s.paymentProofCoverage === 0) {
    f.push({
      code: "UNIFORM_UNPAID_SCORES",
      severity: "critical",
      statement: "Every review carries an identical score and none is backed by a payment.",
      measured: `${s.distinctScoreValues} distinct value across ${s.sample} reviews, 0 payment proofs`,
    });
  }
  // A launch flurry is not fraud on its own. Burst timing is only damning when
  // not one of those reviews is backed by a payment.
  if (s.sample >= THRESHOLDS.uniformSampleFloor && s.burstShare >= THRESHOLDS.burstShare) {
    f.push({
      code: "BURST_TIMED_REVIEWS",
      severity: s.paymentProofCoverage === 0 ? "critical" : "warning",
      statement: "Reviews arrived in a single burst rather than accumulating through use.",
      measured: `${pct(s.burstShare)} of reviews inside one 24h window`,
    });
  }
  if (s.selfIssued > 0) {
    f.push({
      code: "SELF_ISSUED_FEEDBACK",
      severity: "critical",
      statement: "The agent's own owner or wallet wrote some of its reviews.",
      measured: `${s.selfIssued} of ${s.sample} reviews are self-issued`,
    });
  }

  // ---- warnings: the signal may be real but is not verifiable -------------
  if (s.sample === 0) {
    f.push({
      code: "NO_FEEDBACK",
      severity: "warning",
      statement: "No reputation exists to check.",
      measured: "0 non-revoked feedback entries",
    });
  } else if (s.paymentProofCoverage === 0) {
    f.push({
      code: "NO_PAYMENT_PROOF",
      severity: "warning",
      statement: "No review is backed by a payment anyone can verify on-chain.",
      measured: `0 of ${s.sample} reviews carry proofOfPaymentTxHash`,
    });
  } else if (s.paidFeedback < THRESHOLDS.minPaidFeedback) {
    f.push({
      code: "THIN_PAYMENT_PROOF",
      severity: "warning",
      statement: "Too few payment-backed reviews to stand on.",
      measured: `${s.paidFeedback} paid of ${s.sample} (${pct(s.paymentProofCoverage)})`,
    });
  }
  if (s.sample > 0 && s.topReviewerShare >= THRESHOLDS.concernTopReviewerShare
      && s.topReviewerShare < THRESHOLDS.washTopReviewerShare) {
    f.push({
      code: "CONCENTRATED_REVIEWERS",
      severity: "warning",
      statement: "Reputation leans heavily on one reviewer.",
      measured: `${pct(s.topReviewerShare)} from one address, HHI ${s.reviewerHHI.toFixed(2)}`,
    });
  }
  if (s.validations === 0) {
    f.push({
      code: "NO_VALIDATION",
      severity: "warning",
      statement: "No independent validator has ever attested to this agent.",
      measured: "0 entries in the validation registry",
    });
  }
  if (s.registrationCompleteness < 0.5) {
    f.push({
      code: "SPARSE_REGISTRATION",
      severity: "warning",
      statement: "The registration declares little about what this agent can actually do.",
      measured: `${s.declared.length}/${s.declared.length + s.missing.length} fields — missing ${s.missing.join(", ")}`,
    });
  }
  if (s.sample > 0 && s.namedTool === 0) {
    f.push({
      code: "UNATTRIBUTED_REVIEWS",
      severity: "info",
      statement: "No review says which tool or skill it is rating.",
      measured: `0 of ${s.sample} reviews name an mcpTool`,
    });
  }

  // ---- verdict ------------------------------------------------------------
  const critical = f.filter((x) => x.severity === "critical");
  const earned =
    s.paidReviewers >= THRESHOLDS.minPaidReviewers &&
    s.paidFeedback >= THRESHOLDS.minPaidFeedback &&
    s.paidTopReviewerShare <= THRESHOLDS.maxPaidTopShare;

  let verdict: Verdict;
  let headline: string;
  if (critical.length > 0) {
    verdict = "WASH_REPUTATION_DETECTED";
    headline = critical[0]!.statement;
  } else if (earned) {
    verdict = "VERIFIED";
    headline = `${s.paidFeedback} payment-backed reviews from ${s.paidReviewers} independent addresses.`;
  } else {
    verdict = "UNPROVEN";
    headline = s.sample === 0
      ? "This agent has no reputation to verify."
      : "Reputation exists, but nothing about it can be independently verified.";
  }

  // Confidence is earned only from payment-backed, independent reviews.
  let confidence = 0;
  if (verdict === "VERIFIED") {
    const depth = Math.min(1, s.paidFeedback / 25);
    const spread = Math.min(1, s.paidReviewers / 10);
    const independence = 1 - s.paidTopReviewerShare;
    confidence = Math.round(100 * (0.4 * depth + 0.35 * spread + 0.25 * independence));
  } else if (verdict === "UNPROVEN") {
    confidence = Math.round(100 * 0.25 * Math.min(1, s.paymentProofCoverage * 4));
  }

  return { verdict, confidence, headline, findings: f };
}
