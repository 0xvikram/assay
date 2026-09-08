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
  /** Reviews whose author is the agent's own owner or wallet. */
  selfIssued: number;
  distinctScoreValues: number;
  /** Largest share of the sample landing inside any single 24h window. 0..1 */
  burstShare: number;
  namedTool: number;
  validations: number;
  validationsPassed: number;
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

  const hasPayment = (f: RawFeedback) => Boolean(f.feedbackFile?.proofOfPaymentTxHash);
  const paid = live.filter(hasPayment);

  const paidByReviewer = new Map<string, number>();
  for (const f of paid) {
    const k = f.clientAddress.toLowerCase();
    paidByReviewer.set(k, (paidByReviewer.get(k) ?? 0) + 1);
  }
  const paidTop = paid.length ? Math.max(...paidByReviewer.values()) / paid.length : 0;

  const owned = new Set([agent.owner?.toLowerCase(), agent.agentWallet?.toLowerCase()].filter(Boolean) as string[]);
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
    selfIssued,
    distinctScoreValues: values.size,
    burstShare: n ? burst / n : 0,
    namedTool: live.filter((f) => Boolean(f.feedbackFile?.mcpTool)).length,
    validations: vs.length,
    validationsPassed: vs.filter((v) => (v.status ?? "").toUpperCase().includes("PASS")).length,
    registrationCompleteness: declared.length / fields.length,
    declared,
    missing,
    ageDays,
  };
}
