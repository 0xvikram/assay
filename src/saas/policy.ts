/**
 * A company's payment policy: what its agents may do with each verdict. Pure
 * and framework-free, so the dashboard, the guard and the tests read the same
 * rules the same way.
 */
export interface PolicyRules {
  /** A payee with earned, payment-backed reputation. */
  verified: "pay" | "approve";
  /** Reputation that can't be verified yet: pay, pay only up to a cap, or refuse. */
  unproven: "pay" | "cap" | "refuse";
  unprovenCapUsd: number;
  /** Manufactured reputation. Refused, or sent to a person — never paid automatically. */
  wash: "refuse" | "approve";
  /** No ERC-8004 registration at all: nothing to check. */
  unregistered: "pay" | "refuse";
  /** Anything above this goes to a person first, whatever the verdict. Null: never. */
  approveAboveUsd: number | null;
}

export const DEFAULT_RULES: PolicyRules = {
  verified: "pay",
  unproven: "cap",
  unprovenCapUsd: 1,
  wash: "refuse",
  unregistered: "pay",
  approveAboveUsd: 5,
};

export type PolicyVerdict = "VERIFIED" | "UNPROVEN" | "WASH_REPUTATION_DETECTED";

export interface PolicyDecision { action: "pay" | "refuse" | "approve"; why: string }

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;

/**
 * Refusing a farm outranks everything, including a human's standing approval
 * threshold. Then the size of the payment, then the verdict. An amount the
 * guard cannot price in dollars is treated as over any cap — unknown is not small.
 */
export function decide(rules: PolicyRules, verdict: PolicyVerdict | null, amountUsd: number | null): PolicyDecision {
  if (verdict === "WASH_REPUTATION_DETECTED") {
    return rules.wash === "refuse"
      ? { action: "refuse", why: "the payee's reputation is manufactured" }
      : { action: "approve", why: "the payee's reputation is manufactured; a person has to decide" };
  }
  if (rules.approveAboveUsd != null && (amountUsd == null || amountUsd > rules.approveAboveUsd)) {
    return { action: "approve", why: amountUsd == null ? "the amount can't be priced in dollars, so it goes to a person" : `${usd(amountUsd)} is above the ${usd(rules.approveAboveUsd)} approval threshold` };
  }
  if (verdict === null) {
    return rules.unregistered === "pay"
      ? { action: "pay", why: "the payee isn't a registered agent; there's no record to check" }
      : { action: "refuse", why: "the payee isn't a registered agent, and this policy refuses unknown payees" };
  }
  if (verdict === "VERIFIED") {
    return rules.verified === "pay" ? { action: "pay", why: "the payee is VERIFIED" } : { action: "approve", why: "this policy sends every payment to a person" };
  }
  if (rules.unproven === "pay") return { action: "pay", why: "UNPROVEN payees are allowed" };
  if (rules.unproven === "refuse") return { action: "refuse", why: "this policy refuses UNPROVEN payees" };
  if (amountUsd != null && amountUsd <= rules.unprovenCapUsd) return { action: "pay", why: `${usd(amountUsd)} is within the ${usd(rules.unprovenCapUsd)} cap for UNPROVEN payees` };
  return { action: "approve", why: amountUsd == null ? "the amount can't be checked against the UNPROVEN cap" : `${usd(amountUsd)} is over the ${usd(rules.unprovenCapUsd)} cap for UNPROVEN payees` };
}

/** Parse what the dashboard sends. Errors say which field and what it accepts. */
export function validateRules(x: unknown): PolicyRules {
  const o = (x ?? {}) as Record<string, unknown>;
  const pick = <T extends string>(k: string, allowed: readonly T[]): T => {
    if (!allowed.includes(o[k] as T)) throw new Error(`${k} must be one of ${allowed.join(", ")}`);
    return o[k] as T;
  };
  const money = (k: string, nullable: boolean): number | null => {
    const v = o[k];
    if (nullable && (v === null || v === "" || v === undefined)) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new Error(`${k} must be a dollar amount between 0 and 1,000,000`);
    return n;
  };
  return {
    verified: pick("verified", ["pay", "approve"] as const),
    unproven: pick("unproven", ["pay", "cap", "refuse"] as const),
    unprovenCapUsd: money("unprovenCapUsd", false)!,
    wash: pick("wash", ["refuse", "approve"] as const),
    unregistered: pick("unregistered", ["pay", "refuse"] as const),
    approveAboveUsd: money("approveAboveUsd", true),
  };
}
