import type { RawAgent, RawFeedback } from "../graph/queries";

export interface Signals {
  /** Non-revoked feedback entries actually examined. */
  sample: number;
  revoked: number;
  distinctReviewers: number;
  /** Share of the sample contributed by the single busiest reviewer. 0..1 */
  topReviewerShare: number;
  topReviewer: string | null;
  /** Herfindahl index over reviewer shares. 1.0 = one reviewer, ->0 = many. */
  reviewerHHI: number;
  /** Fraction of the sample whose feedback file names an on-chain payment. 0..1 */
  paymentProofCoverage: number;
  paidFeedback: number;
  /** Distinct reviewers who backed their review with a verifiable payment. */
  paidReviewers: number;
  /** Concentration recomputed over payment-backed feedback only. */
  paidTopReviewerShare: number;
  /** Distinct wallets that paid for the valid payment-backed reviews. */
  paidPayers: number;
  /** Concentration over payers, not reviewers: a sybil ring is many reviewers and one wallet paying. */
  paidTopPayerShare: number;
  topPayer: string | null;
  /** Reviews citing a payment the agent's own owner or wallet made — manufactured proof. */
  selfPaid: number;
  /** Reviews beyond the first that cite a transaction already cited. */
  reusedProofs: number;
  /** Proofs paying an EVM address the agent does not own, when the agent declares a wallet. */
  proofsToOthers: number;
  /** Reviews whose author is the agent's own owner or wallet. */
  selfIssued: number;
  distinctScoreValues: number;
  /** Largest share of the sample landing inside any single 24h window. 0..1 */
  burstShare: number;
  namedTool: number;
  validations: number;
  validationsPassed: number;
  /** Attestations from the agent's own owner or wallet — not independent, never counted. */
  selfValidated: number;
  /** Attestations from validators the agent does not control. */
  independentValidations: number;
  /** Their 0–100 responses where one was given. Whether a score passes is a threshold, and thresholds live in verdict.ts. */
  independentResponses: number[];
  /** 0..1 over declared registration fields. */
  registrationCompleteness: number;
  declared: string[];
  missing: string[];
  ageDays: number | null;
}

const DAY = 86_400;

function shares(counts: Map<string, number>, total: number): number[] {
  return [...counts.values()].map((c) => c / total);
}

export function computeSignals(agent: RawAgent): Signals {
  const all = agent.feedback ?? [];
  const live = all.filter((f) => !f.isRevoked);
  const n = live.length;

  const byReviewer = new Map<string, number>();
  for (const f of live) {
    const k = f.clientAddress.toLowerCase();
    byReviewer.set(k, (byReviewer.get(k) ?? 0) + 1);
  }
  let topReviewer: string | null = null;
  let topCount = 0;
  for (const [addr, c] of byReviewer) if (c > topCount) { topCount = c; topReviewer = addr; }

  const owned = new Set([agent.owner?.toLowerCase(), agent.agentWallet?.toLowerCase()].filter(Boolean) as string[]);
  const isEvm = (a: string | null) => a !== null && /^0x[0-9a-f]{40}$/.test(a);

  // A proof of payment is only evidence if someone independent actually paid
  // this agent, once. Each proof is classified before it is counted, so that a
  // farm cannot manufacture one by paying itself, citing one transaction many
  // times, or attaching a payment that went to somebody else.
  const hasPayment = (f: RawFeedback) => Boolean(f.feedbackFile?.proofOfPaymentTxHash);
  const seenTx = new Set<string>();
  let selfPaid = 0, reusedProofs = 0, proofsToOthers = 0;
  const paid: RawFeedback[] = [];
  for (const f of live.filter(hasPayment)) {
    const ff = f.feedbackFile!;
    const tx = ff.proofOfPaymentTxHash!.toLowerCase();
    const from = ff.proofOfPaymentFromAddress?.toLowerCase() ?? null;
    const to = ff.proofOfPaymentToAddress?.toLowerCase() ?? null;
    if (from && owned.has(from)) { selfPaid++; continue; }
    if (seenTx.has(tx)) { reusedProofs++; continue; }
    seenTx.add(tx);
    // Cross-chain payments land on accounts a registration cannot list — a
    // Hedera account, say — so only an EVM recipient checked against a
    // declared wallet says anything. Our own receipts pay a Hedera account.
    if (agent.agentWallet && isEvm(to) && !owned.has(to!)) { proofsToOthers++; continue; }
    paid.push(f);
  }

  const paidByReviewer = new Map<string, number>();
  const paidByPayer = new Map<string, number>();
  for (const f of paid) {
    const reviewer = f.clientAddress.toLowerCase();
    // A proof that names no payer is attributed to its reviewer: we cannot
    // show those two are different, so we do not assume they are.
    const payer = (f.feedbackFile!.proofOfPaymentFromAddress ?? f.clientAddress).toLowerCase();
    paidByReviewer.set(reviewer, (paidByReviewer.get(reviewer) ?? 0) + 1);
    paidByPayer.set(payer, (paidByPayer.get(payer) ?? 0) + 1);
  }
  const paidTop = paid.length ? Math.max(...paidByReviewer.values()) / paid.length : 0;
  let topPayer: string | null = null;
  let topPayerCount = 0;
  for (const [addr, c] of paidByPayer) if (c > topPayerCount) { topPayerCount = c; topPayer = addr; }
  const selfIssued = live.filter((f) => owned.has(f.clientAddress.toLowerCase())).length;

  const values = new Set(live.map((f) => f.value ?? "").filter((v) => v !== ""));

  // Densest 24h window over review timestamps — a farm reviews in bursts.
  const ts = live.map((f) => Number(f.createdAt)).sort((a, b) => a - b);
  let burst = 0;
  for (let i = 0, j = 0; i < ts.length; i++) {
    while (j < ts.length && ts[j]! - ts[i]! <= DAY) j++;
    burst = Math.max(burst, j - i);
  }

  const rf = agent.registrationFile;
  const fields: [string, unknown][] = [
    ["name", rf?.name], ["description", rf?.description], ["mcpEndpoint", rf?.mcpEndpoint],
    ["mcpTools", rf?.mcpTools?.length ? rf.mcpTools : null], ["a2aEndpoint", rf?.a2aEndpoint],
    ["webEndpoint", rf?.webEndpoint], ["ens", rf?.ens], ["did", rf?.did],
    ["supportedTrusts", rf?.supportedTrusts?.length ? rf.supportedTrusts : null],
  ];
  const declared = fields.filter(([, v]) => v != null && v !== "").map(([k]) => k);
  const missing = fields.filter(([, v]) => v == null || v === "").map(([k]) => k);

  const created = Number(agent.createdAt);
  const ageDays = Number.isFinite(created) && created > 0
    ? Math.floor((Date.now() / 1000 - created) / DAY)
    : null;

  const vs = agent.validations ?? [];
  // A validator the agent controls is the agent vouching for itself — the same
  // self-dealing the reviews are checked for, so it is split out before counting.
  const selfV = vs.filter((v) => owned.has(v.validatorAddress.toLowerCase()));
  const indepV = vs.filter((v) => !owned.has(v.validatorAddress.toLowerCase()));

  return {
    sample: n,
    revoked: all.length - n,
    distinctReviewers: byReviewer.size,
    topReviewerShare: n ? topCount / n : 0,
    topReviewer,
    reviewerHHI: n ? shares(byReviewer, n).reduce((a, s) => a + s * s, 0) : 0,
    paymentProofCoverage: n ? paid.length / n : 0,
    paidFeedback: paid.length,
    paidReviewers: paidByReviewer.size,
    paidTopReviewerShare: paidTop,
    paidPayers: paidByPayer.size,
    paidTopPayerShare: paid.length ? topPayerCount / paid.length : 0,
    topPayer,
    selfPaid,
    reusedProofs,
    proofsToOthers,
    selfIssued,
    distinctScoreValues: values.size,
    burstShare: n ? burst / n : 0,
    namedTool: live.filter((f) => Boolean(f.feedbackFile?.mcpTool)).length,
    validations: vs.length,
    validationsPassed: vs.filter((v) => (v.status ?? "").toUpperCase().includes("PASS")).length,
    selfValidated: selfV.length,
    independentValidations: indepV.length,
    independentResponses: indepV.map((v) => v.response).filter((r): r is number => typeof r === "number"),
    registrationCompleteness: declared.length / fields.length,
    declared,
    missing,
    ageDays,
  };
}
