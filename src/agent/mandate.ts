import { readFileSync } from "node:fs";
import type { x402Client } from "@x402/core/client";
import type { Verdict } from "../engine/score/verdict";

/**
 * A human-written envelope the agent cannot exceed. The cap is enforced in
 * the payment client's own hook, before a payment is ever signed — app logic
 * that merely declines to call the paid route is a courtesy, not a control.
 */
export interface Mandate {
  /** Ceiling per payment, in the smallest unit of the accepted asset (tinybar for HBAR). */
  maxPaymentAmount: string;
  /** Ceiling for the whole run. */
  maxTotalAmount: string;
  allowedVerdicts: Verdict[];
  /** Above this amount, an UNPROVEN counterparty needs a human step-up before we pay them. */
  requireStepUpAbove: string;
  expiresAt: string;
}

export function loadMandate(path = "mandate.json"): Mandate {
  const m = JSON.parse(readFileSync(path, "utf8")) as Mandate;
  if (new Date(m.expiresAt).getTime() < Date.now()) throw new Error(`mandate expired at ${m.expiresAt}`);
  return m;
}

export interface Ledger { spent: bigint; payments: { amount: string; asset: string; network: string }[] }

/** Wire the cap into the client so an over-limit payment is aborted, not just avoided. */
export function enforce(client: x402Client, mandate: Mandate, ledger: Ledger): x402Client {
  return client
    .onBeforePaymentCreation(async ({ selectedRequirements: r }) => {
      const amount = BigInt(r.amount);
      if (amount > BigInt(mandate.maxPaymentAmount)) {
        return { abort: true, reason: `payment ${r.amount} ${r.asset} exceeds per-payment cap ${mandate.maxPaymentAmount}` };
      }
      if (ledger.spent + amount > BigInt(mandate.maxTotalAmount)) {
        return { abort: true, reason: `payment ${r.amount} would exceed run cap ${mandate.maxTotalAmount} (spent ${ledger.spent})` };
      }
    })
    .onAfterPaymentCreation(async ({ selectedRequirements: r }) => {
      ledger.spent += BigInt(r.amount);
      ledger.payments.push({ amount: r.amount, asset: r.asset, network: r.network });
    });
}

export type Decision =
  | { action: "proceed"; why: string }
  | { action: "refuse"; why: string }
  | { action: "step-up"; why: string };

/** What the mandate says to do with a counterparty, given what we paid to learn. */
export function decide(mandate: Mandate, verdict: Verdict, intendedSpend: string): Decision {
  if (!mandate.allowedVerdicts.includes(verdict)) {
    return { action: "refuse", why: `${verdict} is not an allowed verdict under this mandate` };
  }
  if (verdict === "UNPROVEN" && BigInt(intendedSpend) > BigInt(mandate.requireStepUpAbove)) {
    return { action: "step-up", why: `UNPROVEN counterparty and intended spend ${intendedSpend} is above ${mandate.requireStepUpAbove}; a human must approve` };
  }
  return { action: "proceed", why: verdict === "VERIFIED" ? "payment-backed reputation from independent addresses" : "within the unproven-spend allowance" };
}
