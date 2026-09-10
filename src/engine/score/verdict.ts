import type { Signals } from "./signals";

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
  /** What would change this verdict. Every step costs real, payment-backed work. */
  nextSteps: string[];
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
  /** An independent validator's 0–100 response at or above this is a pass. Evidence only; it never moves confidence. */
  validationPassScore: 50,
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function assess(s: Signals): Assessment {
  const f: Finding[] = [];

  // ---- critical: the signal is manufactured -------------------------------
  // Concentration means nothing below a sample floor: one review from one
  // address is 100% "concentrated" and says only that the agent is new. Our own
  // first receipt taught us that. Below the floor the verdict stays UNPROVEN.
  if (s.sample >= THRESHOLDS.uniformSampleFloor && s.topReviewerShare >= THRESHOLDS.washTopReviewerShare) {
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
  if (s.selfPaid > 0) {
    f.push({
      code: "SELF_PAID_PROOF",
      severity: "critical",
      statement: "The agent paid itself to manufacture proof of payment.",
      measured: `${s.selfPaid} review${s.selfPaid === 1 ? "" : "s"} cite a payment from the agent's own owner or wallet — not counted`,
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
  if (s.reusedProofs > 0) {
    f.push({
      code: "REUSED_PAYMENT_PROOF",
      severity: "warning",
      statement: "One payment is cited as proof for several reviews.",
      measured: `${s.reusedProofs} review${s.reusedProofs === 1 ? "" : "s"} reuse a transaction already cited — each transaction counted once`,
    });
  }
  if (s.proofsToOthers > 0) {
    f.push({
      code: "PAYMENT_TO_ANOTHER_ADDRESS",
      severity: "warning",
      statement: "Some payment proofs paid someone other than this agent.",
      measured: `${s.proofsToOthers} proof${s.proofsToOthers === 1 ? "" : "s"} name a recipient that is not the agent's declared wallet — not counted`,
    });
  }
  if (s.paidFeedback >= THRESHOLDS.minPaidFeedback && s.paidTopPayerShare > THRESHOLDS.maxPaidTopShare) {
    f.push({
      code: "SINGLE_PAYER_REVIEWS",
      severity: "warning",
      statement: "Payment-backed reviews trace back to one payer.",
      measured: `${pct(s.paidTopPayerShare)} of paid reviews were paid for by ${s.topPayer}, across ${s.paidReviewers} reviewer addresses`,
    });
  }
  if (s.sample >= THRESHOLDS.uniformSampleFloor && s.topReviewerShare >= THRESHOLDS.concernTopReviewerShare
      && s.topReviewerShare < THRESHOLDS.washTopReviewerShare) {
    f.push({
      code: "CONCENTRATED_REVIEWERS",
      severity: "warning",
      statement: "Reputation leans heavily on one reviewer.",
      measured: `${pct(s.topReviewerShare)} from one address, HHI ${s.reviewerHHI.toFixed(2)}`,
    });
  }
  // Validation is reported as evidence beside the verdict and never feeds
  // confidence: that is earned only from payment-backed, independent reviews.
  if (s.independentValidations === 0) {
    f.push({
      code: "NO_VALIDATION",
      severity: "warning",
      statement: "No independent validator has ever attested to this agent.",
      measured: s.selfValidated > 0
        ? `${s.selfValidated} attestation${s.selfValidated === 1 ? "" : "s"} in the validation registry, all from the agent itself`
        : "0 entries in the validation registry",
    });
  }
  if (s.selfValidated > 0) {
    f.push({
      code: "SELF_VALIDATED",
      severity: "warning",
      statement: "The agent's own owner or wallet attested to it.",
      measured: `${s.selfValidated} self-attestation${s.selfValidated === 1 ? "" : "s"} — not independent, not counted`,
    });
  }
  if (s.independentValidations > 0) {
    const passed = s.independentResponses.filter((r) => r >= THRESHOLDS.validationPassScore).length;
    const failed = s.independentResponses.length - passed;
    const pending = s.independentValidations - s.independentResponses.length;
    f.push({
      code: "INDEPENDENTLY_VALIDATED",
      severity: "info",
      statement: "Independent validators have attested to this agent.",
      measured: `${s.independentValidations} from validators it does not control: ${passed} passed, ${failed} failed, ${pending} pending — evidence, not counted toward confidence`,
    });
    if (failed > 0) {
      f.push({
        code: "VALIDATION_FAILED",
        severity: "warning",
        statement: "An independent validator scored this agent below the pass mark.",
        measured: `${failed} of ${s.independentResponses.length} responses below ${THRESHOLDS.validationPassScore}/100`,
      });
    }
  }
  if (s.registrationCompleteness < 0.5) {
    f.push({
      code: "SPARSE_REGISTRATION",
      severity: "warning",
      statement: "The registration declares little about what this agent can actually do.",
      measured: `${s.declared.length}/${s.declared.length + s.missing.length} fields — missing ${s.missing.join(", ")}`,
    });
  }
  if (s.sample > 0 && s.sample < THRESHOLDS.uniformSampleFloor) {
    f.push({
      code: "THIN_SAMPLE",
      severity: "info",
      statement: "Too few reviews to judge concentration or timing.",
      measured: `${s.sample} of the ${THRESHOLDS.uniformSampleFloor} needed before those detectors apply`,
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
  // Independence has to hold for payers as well as reviewers: five reviewer
  // addresses paid for by one wallet are one opinion bought five times.
  const earned =
    s.paidReviewers >= THRESHOLDS.minPaidReviewers &&
    s.paidPayers >= THRESHOLDS.minPaidReviewers &&
    s.paidFeedback >= THRESHOLDS.minPaidFeedback &&
    s.paidTopReviewerShare <= THRESHOLDS.maxPaidTopShare &&
    s.paidTopPayerShare <= THRESHOLDS.maxPaidTopShare;

  // Anyone may write free feedback about any agent — including an attacker who
  // wants a good agent to look like a farm. Payment-backed evidence outranks
  // free evidence: when the paid population stands on its own, manufactured
  // unpaid reviews are noise to report, not a verdict. Self-dealing is the one
  // signal that stays damning: reviews the agent wrote itself, or proof of
  // payment it bought from itself.
  const selfIssued = critical.some((x) => x.code === "SELF_ISSUED_FEEDBACK" || x.code === "SELF_PAID_PROOF");
  const outranked = earned && !selfIssued && critical.length > 0;
  if (outranked) {
    for (const x of critical) x.severity = "warning";
    f.push({
      code: "UNPAID_NOISE_OUTRANKED",
      severity: "info",
      statement: "Manufactured unpaid reviews are present but outranked by payment-backed evidence.",
      measured: `${s.paidFeedback} paid reviews from ${s.paidPayers} independent payers stand on their own`,
    });
  }

  let verdict: Verdict;
  let headline: string;
  if (selfIssued || (critical.length > 0 && !earned)) {
    verdict = "WASH_REPUTATION_DETECTED";
    headline = critical[0]!.statement;
  } else if (earned) {
    verdict = "VERIFIED";
    headline = `${s.paidFeedback} payment-backed reviews from ${s.paidPayers} independent payers.`;
  } else {
    verdict = "UNPROVEN";
    headline = s.sample === 0
      ? "This agent has no reputation to verify."
      : "Reputation exists, but nothing about it can be independently verified.";
  }

  // Confidence is earned only from payment-backed, independent reviews. When
  // manufactured noise had to be outranked, the paid evidence is doing all the
  // work and we say so by halving what it earns.
  let confidence = 0;
  if (verdict === "VERIFIED") {
    const depth = Math.min(1, s.paidFeedback / 25);
    const spread = Math.min(1, Math.min(s.paidReviewers, s.paidPayers) / 10);
    const independence = 1 - Math.max(s.paidTopReviewerShare, s.paidTopPayerShare);
    confidence = Math.round(100 * (0.4 * depth + 0.35 * spread + 0.25 * independence));
    if (outranked) confidence = Math.round(confidence / 2);
  } else if (verdict === "UNPROVEN") {
    confidence = Math.round(100 * 0.25 * Math.min(1, s.paymentProofCoverage * 4));
  }

  return { verdict, confidence, headline, findings: f, nextSteps: nextSteps(s, verdict, selfIssued) };
}

/**
 * What would change this verdict. UNPROVEN must read as a path, not a
 * punishment, and WASH must say exactly what it would take to outrank the
 * manufactured signal — otherwise a good agent has no way to earn its way out.
 * Only payment-backed reviews count, so every step here costs the agent real
 * work; that is the point.
 */
function nextSteps(s: Signals, verdict: Verdict, selfIssued: boolean): string[] {
  const out: string[] = [];
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

  if (s.selfIssued > 0) {
    out.push("Revoke the self-issued reviews from the writing address (revokeFeedback); this verdict does not lift while they stand.");
  }
  if (s.selfPaid > 0) {
    out.push("A payment from the agent's own owner or wallet is never proof. This verdict does not lift while reviews cite one.");
  }
  const needPaid = Math.max(0, THRESHOLDS.minPaidFeedback - s.paidFeedback);
  const needPayers = Math.max(0, THRESHOLDS.minPaidReviewers - Math.min(s.paidReviewers, s.paidPayers));
  if (needPaid > 0 || needPayers > 0) {
    const from = needPayers > 0 ? ` from ${n(needPayers, "more independent payer", "more independent payers")}` : "";
    out.push(`${n(needPaid, "more payment-backed review", "more payment-backed reviews")}${from} — each must carry proofOfPayment (fromAddress, toAddress, chainId, txHash).`);
  }
  if (s.paidFeedback > 0 && s.paidTopReviewerShare > THRESHOLDS.maxPaidTopShare) {
    out.push(`Spread the paid reviews: one reviewer wrote ${pct(s.paidTopReviewerShare)} of them; the ceiling is ${pct(THRESHOLDS.maxPaidTopShare)}.`);
  }
  if (s.paidFeedback > 0 && s.paidTopPayerShare > THRESHOLDS.maxPaidTopShare) {
    out.push(`Spread who pays: one wallet paid for ${pct(s.paidTopPayerShare)} of the paid reviews; the ceiling is ${pct(THRESHOLDS.maxPaidTopShare)}.`);
  }
  if (s.registrationCompleteness < 0.5) {
    out.push(`Complete the registration file — missing ${s.missing.join(", ")}.`);
  }
  if (s.independentValidations === 0) {
    out.push("Optional: an attestation from an independent validator. Reported as evidence beside the verdict; confidence still comes only from payment-backed reviews.");
  }
  if (verdict === "VERIFIED") {
    out.unshift(`Confidence grows with depth (${s.paidFeedback}/25 paid reviews) and spread (${Math.min(s.paidReviewers, s.paidPayers)}/10 independent payers).`);
  }
  return out;
}
